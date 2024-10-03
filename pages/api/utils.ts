import { OpenAI } from "openai";
import NodeCache from "node-cache";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const cache = new NodeCache({ stdTTL: 600 });

export async function searchTavily(query: string) {
  // Implement the Tavily search functionality here
}
