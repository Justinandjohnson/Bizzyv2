import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
  }
}

app.post("/api/chat", async (req, res) => {
  const { message, context, useSearch } = req.body;
  try {
    let searchContext = "";
    if (useSearch) {
      const searchResults = await searchTavily(message);
      searchContext = searchResults
        .map((result: any) => result.title + ": " + result.snippet)
        .join("\n");
    }

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant for brainstorming business ideas. Be concise.",
      },
      ...context.map((msg: string) => ({
        role: "user" as const,
        content: msg,
      })),
    ];

    if (useSearch) {
      messages.push({
        role: "user" as const,
        content: "Here are some relevant search results:\n" + searchContext,
      });
    }

    messages.push({ role: "user", content: message });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
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
  } catch (error: unknown) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
    } catch (error) {
      console.error(`Error in chat:`, error);
      res.status(500).json({ error: `Error in chat` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
