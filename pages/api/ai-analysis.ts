import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
});

app.post("/api/ai-analysis", async (req, res) => {
  const { idea, searchableTerms } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a business analysis expert." },
        {
          role: "user",
          content: `Analyze this business idea: ${idea}\nSearchable terms: ${searchableTerms.join(
            ", "
          )}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    res.json({ analysis: response.choices[0].message.content });
    } catch (error) {
      console.error(`Error in ai-analysis:`, error);
      res.status(500).json({ error: `Error in ai-analysis` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
