import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import axios from "axios";
import NodeCache from "node-cache";
import { TavilySearchAPIClient } from "../components/tavily-client";
import {
  getFinancialPlan,
  getCompetitorAnalysis,
} from "../components/business-insights";
import getIndustryTrends from "../components/industry-trends";
import { conductMarketAnalysis } from "../components/market-analysis";

dotenv.config();

console.log("Server starting...");
console.log("Environment variables:");
console.log("PORT:", process.env.PORT);
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Set" : "Not set");
console.log("TAVILY_API_KEY:", process.env.TAVILY_API_KEY ? "Set" : "Not set");

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
const tavilyClient = new TavilySearchAPIClient(TAVILY_API_KEY || "");

const cache = new NodeCache({ stdTTL: 600 });

async function searchTavily(query: string) {
  if (!query || query.trim() === "") {
    throw new Error("Query is empty or missing");
  }

  const cacheKey = `tavily_${query}`;
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) return cachedResult;

  try {
    const response = await axios.post("https://api.tavily.com/search", {
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: "basic",
      max_results: 5,
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
      model: "gpt-4o",
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

app.post("/api/expand-node", async (req, res) => {
  const { nodeId, nodeName, initialIdea, depth, parentChain, selectedNodes } =
    req.body;
  console.log("Received request:", {
    nodeId,
    nodeName,
    initialIdea,
    depth,
    parentChain,
    selectedNodes,
  });
  try {
    // Ensure parentChain is an array
    const parentChainArray = Array.isArray(parentChain) ? parentChain : [];
    const parentChainString = [...parentChainArray, nodeName].join(" > ");

    const allContext = [...parentChainArray, ...selectedNodes];
    const uniqueContext = Array.from(new Set(allContext));

    console.log("uniqueContext before filtering:", uniqueContext);

    // First, ensure all items in uniqueContext are strings
    const uniqueContextStrings = uniqueContext.filter(
      (item): item is string => typeof item === "string"
    );

    let promptContent = `Expand on the concept "${nodeName}" in the context of the initial business idea "${initialIdea}".
    Current depth: ${depth}.
    Full context (including selected nodes): ${uniqueContext.join(" > ")}.
    Provide 3-5 specific, multi-word suggestions that build upon the idea and all the given context. Focus on developing a clear baseline of services and/or features for the business. Ensure each suggestion is unique and not a duplicate of any previous context or suggestion.`;

    if (depth === 1) {
      promptContent += " Start with broad categories of services or features.";
    } else if (depth === 2) {
      promptContent +=
        " Begin to specify the main services or features within the chosen category.";
    } else if (depth === 3) {
      promptContent +=
        " Elaborate on specific aspects or components of the services or features.";
    } else if (depth === 4) {
      promptContent +=
        " Provide detailed characteristics or functionalities of the services or features.";
    } else {
      promptContent +=
        " Focus on refining and finalizing the details of the services or features.";
    }

    console.log("Sending request to OpenAI with prompt:", promptContent);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a business idea development assistant. Help users explore and refine their business concept by providing specific, actionable suggestions for services and features at each stage of development. Use the full context provided to inform your suggestions while focusing on the current depth's goals. Ensure each suggestion is unique and not a duplicate of any previous context or suggestion.",
        },
        {
          role: "user",
          content:
            promptContent +
            "\nRespond with a JSON array of objects, each containing a 'name' property. Ensure each name is unique and not present in the given context.",
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    let responseContent = completion.choices[0].message.content;

    if (responseContent === null) {
      throw new Error("Received null response from OpenAI");
    }

    // Remove markdown formatting if present
    if (responseContent.startsWith("```json")) {
      responseContent = responseContent.replace(/```json\n|\n```/g, "");
    }

    // Now parse the JSON
    const parsedResponse = JSON.parse(responseContent);

    console.log(
      "Received response from OpenAI:",
      completion.choices[0].message.content
    );

    let suggestions = parsedResponse.filter(
      (suggestion: any) =>
        !uniqueContextStrings.some(
          (existing) => existing.toLowerCase() === suggestion.name.toLowerCase()
        )
    );

    suggestions = Array.from(new Set(suggestions.map((s: any) => s.name))).map(
      (name) => ({ name })
    );

    console.log("Filtered suggestions:", suggestions);

    res.json({ nodes: suggestions });
  } catch (error) {
    console.error("Error expanding node:", error);
    res.status(500).json({
      error: "Error expanding node",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

app.post("/api/market-analysis", async (req, res) => {
  const { businessIdea } = req.body;
  try {
    const analysis = await conductMarketAnalysis(businessIdea);
    res.json({ analysis });
  } catch (error) {
    console.error("Error fetching market analysis:", error);
    res.status(500).json({ error: "Error fetching market analysis" });
  }
});

app.post("/api/competitor-analysis", async (req, res) => {
  const { idea } = req.body;
  try {
    // Remove the call to refineBusinessIdea
    // const refinedIdea = await refineBusinessIdea(idea);

    const searchResults = await Promise.all(
      [idea].map(async (term) => {
        try {
          return await tavilyClient.getSearchResults(term, { max_results: 5 });
        } catch (error) {
          console.error(`Error searching for term "${term}":`, error);
          return [];
        }
      })
    );

    // Step 4: Use AI to analyze search results and generate competitor analysis
    const analysisPrompt = `
      Based on the following search results for competitors of the business idea "${idea}":
      ${JSON.stringify(searchResults)}
      
      Provide a competitor analysis in the following JSON format:
      {
        "directCompetitors": ["Competitor 1", "Competitor 2", ...],
        "indirectCompetitors": ["Competitor 1", "Competitor 2", ...],
        "marketShare": {"Competitor 1": 25, "Competitor 2": 15, ...},
        "swotAnalysis": {
          "strengths": ["Strength 1", "Strength 2", ...],
          "weaknesses": ["Weakness 1", "Weakness 2", ...],
          "opportunities": ["Opportunity 1", "Opportunity 2", ...],
          "threats": ["Threat 1", "Threat 2", ...]
        }
      }
    `;

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a business analyst expert." },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const competitorAnalysis = JSON.parse(
      analysisResponse.choices[0].message.content || "{}"
    );
    res.json(competitorAnalysis);
  } catch (error) {
    console.error("Error generating competitor analysis:", error);
    res.status(500).json({ error: "Error generating competitor analysis" });
  }
});

app.post("/api/swot-analysis", async (req, res) => {
  const { idea } = req.body;
  try {
    // Step 1: Generate search terms
    const searchTermsResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a business analyst expert." },
        {
          role: "user",
          content: `Based on the business idea: "${idea}", provide 5 search terms that would help gather information for a SWOT analysis. Respond with a JSON array of strings.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const searchTerms = JSON.parse(
      searchTermsResponse.choices[0].message.content || "[]"
    );

    // Step 2: Use Tavily API to search for information
    const searchResults = await Promise.all(
      searchTerms.map(
        async (term: string) =>
          await tavilyClient.getSearchResults(term, { max_results: 3 })
      )
    );

    // Flatten and format search results
    const formattedResults = searchResults
      .flat()
      .map((result) => `${result.title}: ${result.snippet}`)
      .join("\n\n");

    // Step 3: Use GPT-4 to analyze search results and generate SWOT analysis
    const swotResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a SWOT analysis expert. Provide the analysis in valid JSON format.",
        },
        {
          role: "user",
          content: `Based on the following information about the business idea "${idea}":

${formattedResults}

Perform a SWOT analysis. Provide the analysis in JSON format with the following structure:
{
  "strengths": ["Strength 1", "Strength 2", ...],
  "weaknesses": ["Weakness 1", "Weakness 2", ...],
  "opportunities": ["Opportunity 1", "Opportunity 2", ...],
  "threats": ["Threat 1", "Threat 2", ...]
}
Limit each category to 3-5 items.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    let swotAnalysis;
    try {
      swotAnalysis = JSON.parse(
        swotResponse.choices[0].message.content || "{}"
      );
    } catch (parseError) {
      console.error("Error parsing SWOT analysis:", parseError);
      swotAnalysis = {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      };
    }
    res.json(swotAnalysis);
  } catch (error) {
    console.error("Error in SWOT analysis:", error);
    res.status(500).json({ error: "Error in SWOT analysis" });
  }
});

app.post("/api/industry-trends", async (req, res) => {
  const { idea } = req.body;
  try {
    // First, use GPT to identify relevant industry sectors
    const sectorPrompt = `Identify the top 3 industry sectors or markets related to this business idea: "${idea}". List them separated by commas.`;
    const sectorResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: sectorPrompt }],
      temperature: 0.7,
      max_tokens: 100,
    });
    const sectors =
      sectorResponse.choices[0].message.content
        ?.split(",")
        .map((s) => s.trim()) || [];

    // Now search for trends in these sectors
    const trendsPromises = sectors.map(async (sector) => {
      const response = await axios.post("https://api.tavily.com/search", {
        api_key: TAVILY_API_KEY,
        query: `current industry trends in ${sector}`,
        search_depth: "advanced",
        include_images: false,
        max_results: 5,
      });
      return response.data.results;
    });

    const allResults = (await Promise.all(trendsPromises)).flat();

    // Use GPT to interpret and summarize the trends
    const trendSummaryPrompt = `Summarize the following search results into 5 distinct industry trends related to ${idea}. For each trend, provide a name and an estimated growth percentage. Respond in JSON format with an array of objects, each having 'name' and 'growth' properties:\n\n${JSON.stringify(
      allResults
    )}`;

    const trendSummaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: trendSummaryPrompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const trends = JSON.parse(
      trendSummaryResponse.choices[0].message.content || "[]"
    );
    res.json(trends);
  } catch (error) {
    console.error("Error getting industry trends:", error);
    res.status(500).json({ error: "Error getting industry trends" });
  }
});

app.post("/api/generate-idea", async (req, res) => {
  console.log("Received request to /api/generate-idea");
  console.log("Request body:", req.body);
  const { nodes } = req.body;
  try {
    console.log("Sending request to OpenAI");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert business consultant and idea generator. Your task is to create an innovative, practical, and comprehensive business idea based on the given concepts.",
        },
        {
          role: "user",
          content: `Generate a unique and detailed business idea that combines these concepts: ${nodes}. The idea should be specific, actionable, and innovative. Include the following in your response:
          1. Business Name
          2. One-sentence pitch
          3. Detailed description of the business idea (2-3 paragraphs)
          4. Target market
          5. Key features or services
          6. Potential revenue streams
          7. Initial steps to launch the business`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    console.log("Received response from OpenAI");
    const idea = response.choices[0].message.content;

    if (!idea) {
      throw new Error("Received empty response from OpenAI");
    }

    console.log("Raw idea from OpenAI:", idea);

    const businessName = extractBusinessName(idea);
    const pitch = extractPitch(idea);

    console.log("Extracted business name:", businessName);
    console.log("Extracted pitch:", pitch);

    // Structure the response
    const structuredIdea = {
      businessName,
      pitch,
      description: extractDescription(idea),
      targetMarket: extractTargetMarket(idea),
      keyFeatures: extractKeyFeatures(idea),
      revenueStreams: extractRevenueStreams(idea),
      initialSteps: extractInitialSteps(idea),
      fullDetails: idea,
    };

    console.log("Structured idea:", structuredIdea);
    res.json(structuredIdea);
  } catch (error) {
    console.error("Error generating business idea:", error);
    res.status(500).json({
      error: "Error generating business idea",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

function extractBusinessName(idea: string): string {
  const lines = idea.split("\n");
  for (const line of lines) {
    if (line.toLowerCase().includes("business name")) {
      const match = line.match(/:\s*(.+)/);
      if (match) return match[1].trim();
    }
  }
  return "Unnamed Business";
}

function extractPitch(idea: string): string {
  const match = idea.match(/One-sentence pitch[:\n]\s*(.*)/i);
  return match ? match[1].trim().replace(/\*\*/g, "") : "No pitch available";
}

const extractDescription = (details: string) => {
  const match = details.match(
    /Detailed Description of the Business Idea([\s\S]*?)###/i
  );
  return match ? match[1].trim() : "No description available";
};

const extractTargetMarket = (details: string) => {
  const match = details.match(/Target Market([\s\S]*?)###/i);
  return match ? match[1].trim() : "No target market available";
};

const extractKeyFeatures = (details: string) => {
  const match = details.match(/Key Features or Services([\s\S]*?)###/i);
  return match
    ? match[1]
        .trim()
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f)
    : [];
};

const extractRevenueStreams = (details: string) => {
  const match = details.match(/Potential Revenue Streams([\s\S]*?)###/i);
  return match
    ? match[1]
        .trim()
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s)
    : [];
};

const extractInitialSteps = (details: string) => {
  const match = details.match(/Initial Steps to Launch the Business([\s\S]*)/i);
  return match
    ? match[1]
        .trim()
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s)
    : [];
};

// 1. /api/search endpoint
app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  try {
    const results = await searchTavily(query);
    res.json({ results });
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({ error: "Error performing search" });
  }
});

// 2. /api/finalize-idea endpoint
app.post("/api/finalize-idea", async (req, res) => {
  const { graphData, expandedNodes } = req.body;
  try {
    const nodesString = graphData.nodes
      .map((node: any) => node.name)
      .join(", ");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert business consultant. Your task is to finalize a business idea based on the provided mind map data.",
        },
        {
          role: "user",
          content: `Based on the following mind map nodes: ${nodesString}, create a finalized business idea. Include:
          1. Business Name
          2. One-sentence pitch
          3. Detailed description (2-3 paragraphs)
          4. Target market
          5. Key features or services
          6. Potential revenue streams
          7. Initial steps to launch`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const finalIdea = response.choices[0].message.content;
    res.json({ finalIdea });
  } catch (error) {
    console.error("Error finalizing idea:", error);
    res.status(500).json({ error: "Error finalizing idea" });
  }
});

// 3. /api/trends endpoint
app.get("/api/trends", async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in business trends and market analysis. Provide current trends in the business world.",
        },
        {
          role: "user",
          content:
            "List 5 current business trends with their estimated growth percentage. Respond in JSON format with 'name' and 'growth' properties for each trend.",
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const trends = JSON.parse(response.choices[0].message.content || "[]");
    res.json({ trends });
  } catch (error) {
    console.error("Error fetching industry trends:", error);
    res.status(500).json({ error: "Error fetching industry trends" });
  }
});

// Add this new endpoint
app.post("/api/estimate-generation-time", async (req, res) => {
  const { nodes } = req.body;
  try {
    // This is a simple estimation. You might want to adjust this based on your needs.
    const estimatedTime = Math.min(30, nodes.length * 2); // 2 seconds per node, max 30 seconds
    res.json({ estimatedTime });
  } catch (error) {
    console.error("Error estimating generation time:", error);
    res.status(500).json({ error: "Error estimating generation time" });
  }
});

app.post("/api/financial-plan", async (req, res) => {
  const { businessIdea } = req.body;
  try {
    const financialPlan = await getFinancialPlan(businessIdea);
    res.json(financialPlan);
  } catch (error) {
    console.error("Error generating financial plan:", error);
    res.status(500).json({ error: "Error generating financial plan" });
  }
});

app.post("/api/ai-analysis", async (req, res) => {
  const { idea, searchableTerms } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a business analysis expert." },
        {
          role: "user",
          content: `Analyze this business idea: ${idea}\nSearchable terms: ${searchableTerms.join(
            ", "
          )}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    res.json({ analysis: response.choices[0].message.content });
  } catch (error) {
    console.error("Error in AI analysis:", error);
    res.status(500).json({ error: "Error in AI analysis" });
  }
});

app.post("/api/tavily-search", async (req, res) => {
  const { searchableTerms } = req.body;
  if (
    !searchableTerms ||
    !Array.isArray(searchableTerms) ||
    searchableTerms.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Invalid or missing searchableTerms" });
  }

  try {
    const validTerms = searchableTerms.filter(
      (term) => typeof term === "string" && term.trim() !== ""
    );
    if (validTerms.length === 0) {
      return res.status(400).json({ error: "No valid search terms provided" });
    }
    const results = await Promise.all(
      validTerms.map(async (term) => await searchTavily(term))
    );
    res.json(results.flat());
  } catch (error) {
    console.error("Error in Tavily search:", error);
    res.status(500).json({
      error: "Error in Tavily search",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/api/interpret-analysis", async (req, res) => {
  const { prompt } = req.body;
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
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
  } catch (error) {
    console.error("Error in interpretation:", error);
    res.status(500).json({ error: "Error in interpretation" });
  }
});

app.post("/api/distill-searchable-terms", async (req, res) => {
  const { idea } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a business idea analyst." },
        {
          role: "user",
          content: `Given the business idea: "${idea}", provide 5 key searchable terms or phrases that would help gather relevant market information, even if this exact idea doesn't exist yet. Focus on industry sectors, technologies, or consumer needs that this idea addresses.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    const terms =
      response.choices[0].message.content
        ?.split("\n")
        .map((term) => term.trim()) || [];
    res.json(terms);
  } catch (error) {
    console.error("Error distilling searchable terms:", error);
    res.status(500).json({ error: "Error distilling searchable terms" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Full server URL: http://localhost:${port}`);
});

export default app;
