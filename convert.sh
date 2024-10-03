#!/bin/bash

# Create necessary directories
mkdir -p pages/api

# Create utils.ts
cat << EOF > pages/api/utils.ts
import dotenv from "dotenv";
import { OpenAI } from "openai";
import axios from "axios";
import NodeCache from "node-cache";
import { TavilySearchAPIClient } from "../../components/tavily-client";

dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
export const tavilyClient = new TavilySearchAPIClient(TAVILY_API_KEY || "");

export const cache = new NodeCache({ stdTTL: 600 });

export async function searchTavily(query: string) {
EOF

# Append searchTavily function
sed -n '38,68p' backend/server.ts >> pages/api/utils.ts

# Create individual API route files
for route in chat expand-node market-analysis competitor-analysis financial-plan ai-analysis tavily-search interpret-analysis distill-searchable-terms trends estimate-generation-time
do
  cat << EOF > pages/api/${route}.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { openai, searchTavily } from './utils';
import { getFinancialPlan, getCompetitorAnalysis } from "../../components/business-insights";
import getIndustryTrends from "../../components/industry-trends";
import { conductMarketAnalysis } from "../../components/market-analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
EOF

  case $route in
    chat)
      sed -n '71,127p' backend/server.ts >> pages/api/${route}.ts
      ;;
    expand-node)
      sed -n '130,239p' backend/server.ts >> pages/api/${route}.ts
      ;;
    market-analysis)
      sed -n '241,247p' backend/server.ts >> pages/api/${route}.ts
      ;;
    competitor-analysis)
      sed -n '249,271p' backend/server.ts >> pages/api/${route}.ts
      ;;
    financial-plan)
      sed -n '668,676p' backend/server.ts >> pages/api/${route}.ts
      ;;
    ai-analysis)
      sed -n '681,700p' backend/server.ts >> pages/api/${route}.ts
      ;;
    tavily-search)
      sed -n '703,732p' backend/server.ts >> pages/api/${route}.ts
      ;;
    interpret-analysis)
      sed -n '736,762p' backend/server.ts >> pages/api/${route}.ts
      ;;
    distill-searchable-terms)
      sed -n '769,792p' backend/server.ts >> pages/api/${route}.ts
      ;;
    trends)
      sed -n '627,653p' backend/server.ts >> pages/api/${route}.ts
      ;;
    estimate-generation-time)
      sed -n '656,665p' backend/server.ts >> pages/api/${route}.ts
      ;;
  esac

  cat << EOF >> pages/api/${route}.ts
    } catch (error) {
      console.error(\`Error in ${route}:\`, error);
      res.status(500).json({ error: \`Error in ${route}\` });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(\`Method \${req.method} Not Allowed\`);
  }
}
EOF
done

# Update index.ts to handle all routes
cat << EOF > pages/api/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import chatHandler from './chat';
import expandNodeHandler from './expand-node';
import marketAnalysisHandler from './market-analysis';
import competitorAnalysisHandler from './competitor-analysis';
import financialPlanHandler from './financial-plan';
import aiAnalysisHandler from './ai-analysis';
import tavilySearchHandler from './tavily-search';
import interpretAnalysisHandler from './interpret-analysis';
import distillSearchableTermsHandler from './distill-searchable-terms';
import trendsHandler from './trends';
import estimateGenerationTimeHandler from './estimate-generation-time';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;

  switch (path) {
    case 'chat':
      return chatHandler(req, res);
    case 'expand-node':
      return expandNodeHandler(req, res);
    case 'market-analysis':
      return marketAnalysisHandler(req, res);
    case 'competitor-analysis':
      return competitorAnalysisHandler(req, res);
    case 'financial-plan':
      return financialPlanHandler(req, res);
    case 'ai-analysis':
      return aiAnalysisHandler(req, res);
    case 'tavily-search':
      return tavilySearchHandler(req, res);
    case 'interpret-analysis':
      return interpretAnalysisHandler(req, res);
    case 'distill-searchable-terms':
      return distillSearchableTermsHandler(req, res);
    case 'trends':
      return trendsHandler(req, res);
    case 'estimate-generation-time':
      return estimateGenerationTimeHandler(req, res);
    default:
      res.status(404).json({ error: 'Not Found' });
  }
}
EOF

echo "Conversion complete. Please review the files in pages/api/ and make any necessary adjustments."