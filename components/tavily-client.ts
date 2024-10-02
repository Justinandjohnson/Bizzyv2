import axios from "axios";

interface TavilySearchParams {
  query: string;
  search_depth?: "basic" | "advanced";
  max_results?: number;
  include_images?: boolean;
  include_answer?: boolean;
  include_raw_content?: boolean;
  include_domains?: string[];
  exclude_domains?: string[];
  use_cache?: boolean;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  category?: string;
  published_date?: string;
  // Add other properties as needed based on Tavily's response
}

interface TavilySearchResponse {
  results: TavilySearchResult[];
  query: string;
  count: number;
  // Add other properties as needed based on Tavily's response
}

export class TavilySearchAPIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getSearchResults(query: string, options: any = {}) {
    try {
      const response = await axios.post("https://api.tavily.com/search", {
        api_key: this.apiKey,
        query,
        ...options,
      });
      return response.data.results;
    } catch (error) {
      console.error("Error in Tavily search:", error);
      throw error;
    }
  }
}
