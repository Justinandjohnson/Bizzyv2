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
