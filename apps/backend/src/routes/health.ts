import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response.js';
import { checkAIHealth } from '../services/ai/geminiClient.js';

const router = Router();

router.get('/', async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;
  const ai = await checkAIHealth();

  return sendSuccess(res, {
    status: isDbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        connected: isDbConnected,
        state: dbState // 1 = connected
      },
      aiApi: {
        provider: ai.provider,
        reachable: ai.reachable
      }
    }
  });
});

export default router;
