import axios from "axios";
import dotenv from "dotenv";
import { OpenAI } from "openai";

dotenv.config();

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export interface MarketAnalysis {
  summary: string;
  keyProducts: string[];
  marketTrends: string[];
  potentialCompetitors: string[];
  successPrediction: string;
}

export async function conductMarketAnalysis(
  businessIdea: string
): Promise<MarketAnalysis> {
  if (!TAVILY_API_KEY) {
    throw new Error("Tavily API key is not set");
  }

  try {
    // Step 1: Generate focused search terms
    const searchTermsResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a market research expert. Provide concise, targeted search terms.",
        },
        {
          role: "user",
          content: `For the business idea "${businessIdea}", provide 3 specific search terms to gather market data. Focus on industry trends, key players, and market size.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const searchTerms =
      searchTermsResponse.choices[0].message.content?.split("\n") || [];

    // Step 2: Conduct focused Tavily searches
    const searchResults = await Promise.all(
      searchTerms.map(async (term) => {
        const response = await axios.post("https://api.tavily.com/search", {
          api_key: TAVILY_API_KEY,
          query: term,
          search_depth: "advanced",
          include_images: false,
          max_results: 3,
        });
        return response.data.results;
      })
    );

    const formattedResults = searchResults
      .flat()
      .map((result) => `${result.title}: ${result.snippet}`)
      .join("\n\n");

    // Step 3: Generate concise market analysis
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a market analysis expert. Provide brief, impactful insights based on the given information.",
        },
        {
          role: "user",
          content: `Analyze this data for the business idea "${businessIdea}":

          ${formattedResults}

          Provide a concise market analysis with:
          1. A one-sentence summary
          2. Three key products/services (single words or short phrases)
          3. Three current market trends (brief phrases)
          4. Three potential competitors (company names only)
          5. A one-sentence success prediction

          Format your response as follows:
          Summary: [One-sentence summary]
          Key Products/Services: [Product 1], [Product 2], [Product 3]
          Market Trends: [Trend 1], [Trend 2], [Trend 3]
          Potential Competitors: [Competitor 1], [Competitor 2], [Competitor 3]
          Success Prediction: [One-sentence prediction]`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const analysisText = analysisResponse.choices[0].message.content || "";

    return parseAnalysis(analysisText);
  } catch (error) {
    console.error("Error conducting market analysis:", error);
    throw error;
  }
}

function parseAnalysis(text: string): MarketAnalysis {
  const lines = text.split("\n");
  const analysis: MarketAnalysis = {
    summary: "",
    keyProducts: [],
    marketTrends: [],
    potentialCompetitors: [],
    successPrediction: "",
  };

  lines.forEach((line) => {
    if (line.startsWith("Summary:"))
      analysis.summary = line.replace("Summary:", "").trim();
    if (line.startsWith("Key Products/Services:"))
      analysis.keyProducts = line
        .replace("Key Products/Services:", "")
        .split(",")
        .map((item) => item.trim());
    if (line.startsWith("Market Trends:"))
      analysis.marketTrends = line
        .replace("Market Trends:", "")
        .split(",")
        .map((item) => item.trim());
    if (line.startsWith("Potential Competitors:"))
      analysis.potentialCompetitors = line
        .replace("Potential Competitors:", "")
        .split(",")
        .map((item) => item.trim());
    if (line.startsWith("Success Prediction:"))
      analysis.successPrediction = line
        .replace("Success Prediction:", "")
        .trim();
  });

  return analysis;
}
