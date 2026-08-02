import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

router.post('/', async (_req, res) => {
  return sendSuccess(res, { comparison: [] });
});

export default router;
