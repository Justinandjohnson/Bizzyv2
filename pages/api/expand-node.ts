import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
    });
  }
});

app.post("/api/expand-node", async (req, res) => {
  const { nodeId, nodeName, initialIdea, depth, parentChain, selectedNodes } =
    req.body;
  console.log("Received request:", {
    nodeId,
    nodeName,
    initialIdea,
    depth,
    parentChain,
    selectedNodes,
  });
  try {
    // Ensure parentChain is an array
    const parentChainArray = Array.isArray(parentChain) ? parentChain : [];
    const parentChainString = [...parentChainArray, nodeName].join(" > ");

    const allContext = [...parentChainArray, ...selectedNodes];
    const uniqueContext = Array.from(new Set(allContext));

    console.log("uniqueContext before filtering:", uniqueContext);

    // First, ensure all items in uniqueContext are strings
    const uniqueContextStrings = uniqueContext.filter(
      (item): item is string => typeof item === "string"
    );

    let promptContent = `Expand on the concept "${nodeName}" in the context of the initial business idea "${initialIdea}".
    Current depth: ${depth}.
    Full context (including selected nodes): ${uniqueContext.join(" > ")}.
    Provide 3-5 specific, multi-word suggestions that build upon the idea and all the given context. Focus on developing a clear baseline of services and/or features for the business. Ensure each suggestion is unique and not a duplicate of any previous context or suggestion.`;

    if (depth === 1) {
      promptContent += " Start with broad categories of services or features.";
    } else if (depth === 2) {
      promptContent +=
        " Begin to specify the main services or features within the chosen category.";
    } else if (depth === 3) {
      promptContent +=
        " Elaborate on specific aspects or components of the services or features.";
    } else if (depth === 4) {
      promptContent +=
        " Provide detailed characteristics or functionalities of the services or features.";
    } else {
      promptContent +=
        " Focus on refining and finalizing the details of the services or features.";
    }

    console.log("Sending request to OpenAI with prompt:", promptContent);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a business idea development assistant. Help users explore and refine their business concept by providing specific, actionable suggestions for services and features at each stage of development. Use the full context provided to inform your suggestions while focusing on the current depth's goals. Ensure each suggestion is unique and not a duplicate of any previous context or suggestion.",
        },
        {
          role: "user",
          content:
            promptContent +
            "\nRespond with a JSON array of objects, each containing a 'name' property. Ensure each name is unique and not present in the given context.",
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    let responseContent = completion.choices[0].message.content;

    if (responseContent === null) {
      throw new Error("Received null response from OpenAI");
    }

    // Remove markdown formatting if present
    if (responseContent.startsWith("```json")) {
      responseContent = responseContent.replace(/```json\n|\n```/g, "");
    }

    // Now parse the JSON
    const parsedResponse = JSON.parse(responseContent);

    console.log(
      "Received response from OpenAI:",
      completion.choices[0].message.content
    );

    let suggestions = parsedResponse.filter(
      (suggestion: any) =>
        !uniqueContextStrings.some(
          (existing) => existing.toLowerCase() === suggestion.name.toLowerCase()
        )
    );

    suggestions = Array.from(new Set(suggestions.map((s: any) => s.name))).map(
      (name) => ({ name })
    );

    console.log("Filtered suggestions:", suggestions);

    res.json({ nodes: suggestions });
  } catch (error) {
    console.error("Error expanding node:", error);
    res.status(500).json({
      error: "Error expanding node",
      details: error instanceof Error ? error.message : String(error),
    } catch (error) {
      console.error(`Error in expand-node:`, error);
      res.status(500).json({ error: `Error in expand-node` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
