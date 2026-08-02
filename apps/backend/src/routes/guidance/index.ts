import { Router } from 'express';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

router.get('/:schemeId', async (_req, res) => {
  return sendSuccess(res, { fields: [] });
});

export default router;
