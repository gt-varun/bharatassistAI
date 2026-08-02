import { Router } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth.js';
import { SavedSchemeModel } from '../../models/SavedScheme.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const saved = await SavedSchemeModel.find({ userId: req.user?.userId }).populate('schemeId');
    return sendSuccess(res, saved);
  } catch (error) {
    next(error);
  }
});

export default router;
