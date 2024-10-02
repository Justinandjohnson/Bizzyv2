import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

interface Competitor {
  name: string;
  strength: number;
  revenue?: string;
}

interface TavilySearchResult {
  title: string;
  // Add other properties from the Tavily API response as needed
}

interface TavilyApiResponse {
  results: TavilySearchResult[];
  // Add other properties from the Tavily API response as needed
}

async function conductCompetitorAnalysis(
  businessIdea: string
): Promise<Competitor[]> {
  if (!TAVILY_API_KEY) {
    throw new Error("Tavily API key is not set");
  }

  try {
    const response = await axios.post<TavilyApiResponse>(
      "https://api.tavily.com/search",
      {
        api_key: TAVILY_API_KEY,
        query: `top 5 competitors for ${businessIdea}`,
        search_depth: "advanced",
        include_images: false,
        max_results: 5,
      }
    );

    const results = response.data.results;
    const competitors: Competitor[] = results.map(
      (result: TavilySearchResult) => ({
        name: result.title.split(" - ")[0],
        strength: Math.floor(Math.random() * 41) + 60, // Random strength between 60-100
      })
    );

    return competitors;
  } catch (error) {
    console.error("Error conducting competitor analysis:", error);
    throw new Error(
      `Failed to conduct competitor analysis: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export default conductCompetitorAnalysis;
