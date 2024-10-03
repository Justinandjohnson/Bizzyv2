import dotenv from "dotenv";
import { OpenAI } from "openai";
import axios from "axios";
import NodeCache from "node-cache";
import { TavilySearchAPIClient } from "../../components/tavily-client";

dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
export const tavilyClient = new TavilySearchAPIClient(TAVILY_API_KEY || "");

export const cache = new NodeCache({ stdTTL: 600 });

export async function searchTavily(query: string) {
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
