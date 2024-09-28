import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { nodes, initialIdea } = req.body;

    const prompt = `Based on the initial business idea "${initialIdea}" and the following related concepts: ${nodes
      .map((n: { name: string }) => n.name)
      .join(", ")}, generate a cohesive and innovative final business concept.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const finalIdea = completion.choices[0].message.content;

    res.status(200).json({ finalIdea });
  } catch (error) {
    console.error("Error generating final idea:", error);
    res.status(500).json({ error: "Error generating final idea" });
  }
}
