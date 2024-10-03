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

app.post("/api/interpret-analysis", async (req, res) => {
  const { prompt } = req.body;
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
    } catch (error) {
      console.error(`Error in interpret-analysis:`, error);
      res.status(500).json({ error: `Error in interpret-analysis` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
