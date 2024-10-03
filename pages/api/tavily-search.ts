import { NextApiRequest, NextApiResponse } from "next";
import { searchTavily } from "./utils"; // Adjust the import path as needed

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { searchableTerms } = req.body;
      const results = await searchTavily(searchableTerms.join(" "));
      res.status(200).json(results);
    } catch (error) {
      console.error("Error in Tavily search:", error);
      res.status(500).json({ error: "Error performing Tavily search" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
