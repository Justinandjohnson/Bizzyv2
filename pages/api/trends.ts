import { NextApiRequest, NextApiResponse } from "next";
import { openai } from "./utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

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
    console.error(`Error in trends:`, error);
    res.status(500).json({ error: `Error in trends` });
  }
}
