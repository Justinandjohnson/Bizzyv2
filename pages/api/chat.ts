import { NextApiRequest, NextApiResponse } from "next";
import { openai } from "./utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { message, context, useSearch } = req.body;
    try {
      // Implement the chat functionality here
      // Use the openai instance from utils.ts
      // Return the response
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Error in chat" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
