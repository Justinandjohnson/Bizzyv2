import { NextApiRequest, NextApiResponse } from "next";
import { searchTavily } from "./utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

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
    res.status(500).json({ error: "Error in tavily-search" });
  }
}
