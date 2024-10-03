import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
    res.status(500).json({ error: "Error estimating generation time" });
  }
});

app.post("/api/financial-plan", async (req, res) => {
  const { businessIdea } = req.body;
  try {
    const financialPlan = await getFinancialPlan(businessIdea);
    res.json(financialPlan);
    } catch (error) {
      console.error(`Error in financial-plan:`, error);
      res.status(500).json({ error: `Error in financial-plan` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
