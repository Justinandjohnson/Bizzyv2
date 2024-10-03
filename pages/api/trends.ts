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

// 3. /api/trends endpoint
app.get("/api/trends", async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in business trends and market analysis. Provide current trends in the business world.",
        },
        {
          role: "user",
          content:
            "List 5 current business trends with their estimated growth percentage. Respond in JSON format with 'name' and 'growth' properties for each trend.",
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const trends = JSON.parse(response.choices[0].message.content || "[]");
    res.json({ trends });
  } catch (error) {
    } catch (error) {
      console.error(`Error in trends:`, error);
      res.status(500).json({ error: `Error in trends` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
