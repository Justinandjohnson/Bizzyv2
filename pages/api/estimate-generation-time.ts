import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
  }
});

// Add this new endpoint
app.post("/api/estimate-generation-time", async (req, res) => {
  const { nodes } = req.body;
  try {
    // This is a simple estimation. You might want to adjust this based on your needs.
    const estimatedTime = Math.min(30, nodes.length * 2); // 2 seconds per node, max 30 seconds
    res.json({ estimatedTime });
    } catch (error) {
      console.error(`Error in estimate-generation-time:`, error);
      res.status(500).json({ error: `Error in estimate-generation-time` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
