import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

router.get('/', async (_req, res) => {
  return sendSuccess(res, { items: [] });
});

export default router;
