import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
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
    } catch (error) {
      console.error(`Error in competitor-analysis:`, error);
      res.status(500).json({ error: `Error in competitor-analysis` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
