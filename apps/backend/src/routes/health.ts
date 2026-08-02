import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response.js';
import { checkGeminiHealth } from '../services/ai/geminiClient.js';

const router = Router();

router.get('/', async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;
  const isGeminiReachable = await checkGeminiHealth();

  return sendSuccess(res, {
    status: isDbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        connected: isDbConnected,
        state: dbState // 1 = connected
      },
      geminiApi: {
        reachable: isGeminiReachable
      }
    }
  });
});

export default router;
