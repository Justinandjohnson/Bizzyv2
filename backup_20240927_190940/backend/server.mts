import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import axios from "axios";

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

async function searchTavily(query: string) {
  try {
    const response = await axios.post("https://api.tavily.com/search", {
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: "advanced",
    });
    return response.data.results;
  } catch (error) {
    console.error("Error searching Tavily:", error);
    throw error;
  }
}

app.post("/api/chat", async (req, res) => {
  const { message, context } = req.body;
  try {
    console.log("Received chat request:", { message, context });
    const searchResults = await searchTavily(message);
    console.log("Tavily search results:", searchResults);
    const searchContext = searchResults
      .map((result: any) => result.title + ": " + result.snippet)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant for brainstorming business ideas. Use the provided search results to inform your responses.",
        },
        {
          role: "user",
          content: "Here are some relevant search results:\n" + searchContext,
        },
        ...context.map((msg) => ({ role: "user", content: msg })),
        { role: "user", content: message },
      ],
    });
    console.log("OpenAI response:", response.choices[0].message);
    res.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
