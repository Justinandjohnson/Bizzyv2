import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import NodeCache from "node-cache";

dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Optimize Tavily search
async function searchTavily(query: string) {
  const cacheKey = `tavily_${query}`;
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) return cachedResult;

  try {
    const response = await axios.post("https://api.tavily.com/search", {
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: "basic", // Change to "basic" for faster results
      max_results: 5, // Limit the number of results
    });
    if (!response.data || !response.data.results) {
      throw new Error("Invalid response from Tavily API");
    }
    cache.set(cacheKey, response.data.results);
    return response.data.results;
  } catch (error: any) {
    console.error(
      "Error searching Tavily:",
      error.response?.data || error.message
    );
    throw new Error(
      `Tavily API error: ${error.response?.data?.message || error.message}`
    );
  }
}

app.post("/api/chat", async (req, res) => {
  const { message, context, useSearch } = req.body;
  try {
    let searchContext = "";
    if (useSearch) {
      const searchResults = await searchTavily(message);
      searchContext = searchResults
        .map((result: any) => result.title + ": " + result.snippet)
        .join("\n");
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant for brainstorming business ideas. Be concise.",
      },
      ...context.map((msg: string) => ({
        role: "user" as const,
        content: msg,
      })),
    ];

    if (useSearch) {
      messages.push({
        role: "user" as const,
        content: "Here are some relevant search results:\n" + searchContext,
      });
    }

    messages.push({ role: "user", content: message });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use a faster model for initial responses
      messages: messages,
      stream: true,
    });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: unknown) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      error: "An error occurred while processing your request.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  try {
    const searchResults = await searchTavily(query);
    res.json({ results: searchResults });
  } catch (error: unknown) {
    res.status(500).json({
      error: "An error occurred while processing your request.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/trends", async (req, res) => {
  try {
    const searchResults = await searchTavily(
      "current industry trends with growth percentages"
    );
    if (!searchResults || searchResults.length === 0) {
      throw new Error("No search results found");
    }
    const trendsContext = searchResults
      .map((result: any) => result.title + ": " + result.snippet)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant that provides information about current industry trends. Use the provided search results to inform your response.",
        },
        {
          role: "user",
          content: "Here are some relevant search results:\n" + trendsContext,
        },
        {
          role: "user",
          content:
            "Based on these search results, list 5 current industry trends with their growth percentages.",
        },
      ],
    });
    const trendsText = response.choices[0].message.content || "";
    const trends = trendsText.split("\n").map((trend) => {
      const [name, growthStr] = trend.split(":");
      const growth = parseInt(growthStr?.replace("%", "").trim() || "0");
      return { name: name.trim(), growth };
    });
    res.json({ trends });
  } catch (error: unknown) {
    console.error("Error in /api/trends:", error);
    res.status(500).json({
      error: "An error occurred while processing your request.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/mindmap-suggestion", async (req, res) => {
  const { nodeName, parentName, context } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant for brainstorming business ideas.",
        },
        {
          role: "user",
          content: `Generate a brief suggestion or idea related to "${nodeName}" in the context of the business idea "${parentName}". Consider the following context from previous discussions: ${context.join(
            " "
          )}`,
        },
      ],
    });
    res.json({ suggestion: response.choices[0].message.content });
  } catch (error: unknown) {
    console.error("Error in /api/mindmap-suggestion:", error);
    res.status(500).json({
      error: "An error occurred while processing your request.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/generate-mindmap", async (req, res) => {
  const { idea } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a business idea generator. Create a concise mind map structure for the given idea, focusing on innovative business concepts related to the initial input.",
        },
        {
          role: "user",
          content: `Generate a mind map for the business idea: "${idea}". Provide 5 innovative business concepts directly related to this idea. Respond with a JSON object containing 'nodes' and 'links' arrays. Each node should have 'id', 'name', and 'val' properties. The center node should have id 'center' and name '${idea}'. Keep node names concise (2-3 words max) but ensure they represent clear business ideas or concepts.`,
        },
      ],
    });

    let content = response.choices[0].message.content || "{}";
    content = content.replace(/```json\n?|\n?```/g, "").trim();

    let jsonResponse = JSON.parse(content);
    jsonResponse.nodes = jsonResponse.nodes.map((node: any, index: number) => ({
      ...node,
      id: node.id || (index === 0 ? "center" : `node_${index}`),
      name: node.name.split(" ").slice(0, 3).join(" "),
      val: node.id === "center" ? 20 : 15,
    }));

    jsonResponse.links = jsonResponse.nodes
      .filter((node: any) => node.id !== "center")
      .map((node: any) => ({
        source: "center",
        target: node.id,
      }));

    res.json(jsonResponse);
  } catch (error: unknown) {
    console.error("Error in /api/generate-mindmap:", error);
    res.status(500).json({
      error: "An error occurred while generating the mind map.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/expand-node", async (req, res) => {
  const { nodeId, nodeName, initialIdea } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a business idea expander. Provide innovative and related business concepts for a given idea.",
        },
        {
          role: "user",
          content: `Expand on the business concept "${nodeName}" in the context of the initial idea "${initialIdea}". Generate 3 new related business ideas or strategies. Respond with a JSON object containing 'nodes' and 'links' arrays. Each node should have 'id', 'name', and 'val' properties. Each link should have 'source' and 'target' properties. The 'source' should be "${nodeId}". Keep node names concise (2-3 words max) but ensure they represent clear business ideas or concepts.`,
        },
      ],
    });

    let content = response.choices[0].message.content || "{}";
    content = content.replace(/```json\n?|\n?```/g, "").trim();

    let newData = JSON.parse(content);
    newData.nodes = newData.nodes.map((node: any, index: number) => ({
      ...node,
      id: `${nodeId}_child_${index}`,
      name: node.name.split(" ").slice(0, 3).join(" "),
      val: 15,
    }));

    newData.links = newData.nodes.map((node: any) => ({
      source: nodeId,
      target: node.id,
    }));

    res.json(newData);
  } catch (error: unknown) {
    console.error("Error in /api/expand-node:", error);
    res.status(500).json({
      error: "An error occurred while expanding the node.",
      details: error instanceof Error ? error.message : String(error),
      nodes: [],
      links: [],
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
