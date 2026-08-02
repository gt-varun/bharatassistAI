import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.post('/check', authenticate, async (_req, res) => {
  return sendSuccess(res, { status: 'eligible', reasons: ['Matches target state and occupation'] });
});

export default router;
