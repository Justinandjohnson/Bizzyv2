import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { nodes } = req.body;
      // This is a simple estimation. You might want to adjust this based on your needs.
      const estimatedTime = Math.min(30, nodes.length * 2); // 2 seconds per node, max 30 seconds
      res.json({ estimatedTime });
    } catch (error) {
      console.error(`Error in estimate-generation-time:`, error);
      res.status(500).json({ error: `Error in estimate-generation-time` });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
