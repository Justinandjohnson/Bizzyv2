import { TavilySearchAPIClient } from "./tavily-client";
import axios from "axios";
import { interpretSearchResults } from "./search-analysis";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface BusinessInsight {
  category: string;
  summary: string;
  relevance: number;
  source: string;
}

export interface BusinessAnalysis {
  viabilityScore: number;
  rationale: string;
  similarIdeas: string[];
  refinedIdea: string;
  industryTrends: { name: string; growth: number }[];
  financialPlan: FinancialPlan;
  competitorAnalysis: CompetitorAnalysis;
}

export interface FinancialPlan {
  startupCosts: number;
  monthlyExpenses: number;
  projectedRevenue: number;
  breakEvenPoint: number;
  roi: number;
}

export interface CompetitorAnalysis {
  directCompetitors: string[];
  indirectCompetitors: string[];
  marketShare: { [key: string]: number };
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

export async function analyzeBusinessIdea(
  idea: string
): Promise<Array<{ rationale: string }>> {
  try {
    const searchableTerms = await distillSearchableTerms(idea);
    const searchResults = await performTavilySearch(searchableTerms);
    const aiAnalysis = await interpretSearchResults(idea, searchResults);

    const insights: Array<{ rationale: string }> = [];

    if ("insights" in aiAnalysis && aiAnalysis.insights) {
      if (Array.isArray(aiAnalysis.insights)) {
        insights.push(
          ...aiAnalysis.insights.map((insight) => ({ rationale: insight }))
        );
      } else if (typeof aiAnalysis.insights === "string") {
        insights.push({ rationale: aiAnalysis.insights });
      } else if (typeof aiAnalysis.insights === "object") {
        Object.entries(aiAnalysis.insights).forEach(([key, value]) => {
          insights.push({ rationale: `${key}: ${value}` });
        });
      }
    } else {
      if (typeof aiAnalysis === "string") {
        insights.push({ rationale: aiAnalysis });
      } else if (typeof aiAnalysis === "object" && aiAnalysis !== null) {
        Object.entries(aiAnalysis).forEach(([key, value]) => {
          insights.push({ rationale: `${key}: ${value}` });
        });
      }
    }

    return insights;
  } catch (error) {
    console.error("Error in analyzeBusinessIdea:", error);
    throw error;
  }
}

export async function getFinancialPlan(idea: string): Promise<FinancialPlan> {
  const response = await fetch(`${API_URL}/api/financial-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });
  return response.json();
}

export async function getCompetitorAnalysis(
  idea: string
): Promise<CompetitorAnalysis> {
  const response = await fetch(`${API_URL}/api/competitor-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function explainAnalysis(
  analysis: BusinessAnalysis
): Promise<string> {
  const response = await fetch(`${API_URL}/api/explain-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis }),
  });
  return response.text();
}

async function distillSearchableTerms(idea: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/api/distill-searchable-terms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const terms = await response.json();
    if (!Array.isArray(terms) || terms.length === 0) {
      throw new Error("No searchable terms generated");
    }
    return terms;
  } catch (error) {
    console.error("Error distilling searchable terms:", error);
    return [idea]; // Fallback to using the original idea as a search term
  }
}

export async function getIndustryTrends(
  idea: string
): Promise<{ name: string; growth: number }[]> {
  const response = await fetch(`${API_URL}/api/industry-trends`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });
  return response.json();
}

export async function conductSWOTAnalysis(
  idea: string
): Promise<CompetitorAnalysis["swotAnalysis"]> {
  const response = await fetch(`${API_URL}/api/swot-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });
  return response.json();
}

async function performTavilySearch(searchableTerms: string[]): Promise<any[]> {
  try {
    const response = await fetch(`${API_URL}/api/tavily-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchableTerms }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error performing Tavily search:", error);
    throw error;
  }
}
