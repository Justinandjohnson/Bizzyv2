import axios from "axios";

interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

async function conductSWOTAnalysis(
  businessIdea: string
): Promise<SWOTAnalysis> {
  try {
    const response = await axios.post("/api/swot-analysis", { businessIdea });
    return response.data;
  } catch (error) {
    console.error("Error conducting SWOT analysis:", error);
    throw error;
  }
}

export default conductSWOTAnalysis;
