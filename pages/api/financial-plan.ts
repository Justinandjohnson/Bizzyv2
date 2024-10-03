import { NextApiRequest, NextApiResponse } from "next";
import { getFinancialPlan } from "../../components/business-insights";

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
    const financialPlan = await getFinancialPlan(businessIdea);
    res.json(financialPlan);
  } catch (error) {
    console.error(`Error in financial-plan:`, error);
    res.status(500).json({ error: `Error in financial-plan` });
  }
}
