import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';
import { errorHandler } from './middlewares/error.js';

import healthRouter from './routes/health.js';
import authRouter from './routes/auth/index.js';
import schemesRouter from './routes/schemes/index.js';
import eligibilityRouter from './routes/eligibility/index.js';
import checklistRouter from './routes/checklist/index.js';
import guidanceRouter from './routes/guidance/index.js';
import compareRouter from './routes/compare/index.js';
import assistantRouter from './routes/assistant/index.js';
import recommendationsRouter from './routes/recommendations/index.js';
import profileRouter from './routes/profile/index.js';
import savedRouter from './routes/saved/index.js';

export const createApp = () => {
  const app = express();

  // CORS locked to FRONTEND_URL from env
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.use(
    cors({
      origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    })
  );

  app.use(express.json());
  app.use(pinoHttp({ logger }));

  // Rate limiting specifically for Auth / OTP routes
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again after 15 minutes'
      }
    }
  });

  /**
   * OTP and password-reset are the brute-forceable surfaces: a six-digit code
   * falls in a million tries, and 100 attempts per window is enough to make
   * that worth attempting. These get their own, much tighter budget.
   */
  const otpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    // Per phone number where we have one, so a shared NAT or office IP does
    // not lock out everyone behind it.
    keyGenerator: (req) => `${req.ip}:${(req.body?.phone as string) ?? ''}`,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts. Please wait 15 minutes before trying again.'
      }
    }
  });

  // Mount Routers
  app.use('/api/health', healthRouter);
  app.use(
    ['/api/auth/send-otp', '/api/auth/otp/request', '/api/auth/verify-otp', '/api/auth/otp/verify'],
    otpRateLimiter
  );
  app.use('/api/auth/password/reset', otpRateLimiter);
  app.use('/api/auth', authRateLimiter, authRouter);
  app.use('/api/schemes', schemesRouter);
  app.use('/api/eligibility', eligibilityRouter);
  app.use('/api/checklist', checklistRouter);
  app.use('/api/guidance', guidanceRouter);
  app.use('/api/compare', compareRouter);
  app.use('/api/assistant', assistantRouter);
  app.use('/api/recommendations', recommendationsRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/saved', savedRouter);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
