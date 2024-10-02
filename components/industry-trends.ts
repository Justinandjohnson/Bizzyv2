import axios from "axios";

interface IndustryTrend {
  name: string;
  growth: number;
}

async function getIndustryTrends(
  businessIdea: string
): Promise<IndustryTrend[]> {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/industry-trends`,
      {
        idea: businessIdea,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error getting industry trends:", error);
    throw error;
  }
}

export default getIndustryTrends;
