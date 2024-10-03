import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
app.post("/api/distill-searchable-terms", async (req, res) => {
  const { idea } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a business idea analyst." },
        {
          role: "user",
          content: `Given the business idea: "${idea}", provide 5 key searchable terms or phrases that would help gather relevant market information, even if this exact idea doesn't exist yet. Focus on industry sectors, technologies, or consumer needs that this idea addresses.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    const terms =
      response.choices[0].message.content
        ?.split("\n")
        .map((term) => term.trim()) || [];
    res.json(terms);
  } catch (error) {
    console.error("Error distilling searchable terms:", error);
    res.status(500).json({ error: "Error distilling searchable terms" });
  }
    } catch (error) {
      console.error(`Error in distill-searchable-terms:`, error);
      res.status(500).json({ error: `Error in distill-searchable-terms` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
