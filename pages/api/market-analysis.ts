import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
    });
  }
});

app.post("/api/market-analysis", async (req, res) => {
  const { businessIdea } = req.body;
  try {
    } catch (error) {
      console.error(`Error in market-analysis:`, error);
      res.status(500).json({ error: `Error in market-analysis` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
