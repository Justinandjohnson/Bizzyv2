import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
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
    } catch (error) {
      console.error(`Error in tavily-search:`, error);
      res.status(500).json({ error: `Error in tavily-search` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
