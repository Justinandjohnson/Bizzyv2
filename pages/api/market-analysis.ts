import { NextApiRequest, NextApiResponse } from "next";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { businessIdea } = req.body;
    const analysis = await conductMarketAnalysis(businessIdea);
    res.json(analysis);
  } catch (error) {
    console.error(`Error in market-analysis:`, error);
    res.status(500).json({ error: `Error in market-analysis` });
  }
}
