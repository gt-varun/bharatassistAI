import { Router } from 'express';
import { authenticate, AuthRequest } from '../../middlewares/auth.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const profile = await CitizenProfileModel.findOne({ userId: req.user?.userId });
    if (!profile) {
      return sendError(res, 'Profile not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
});

router.put('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const profile = await CitizenProfileModel.findOneAndUpdate(
      { userId: req.user?.userId },
      { ...req.body, userId: req.user?.userId },
      { new: true, upsert: true }
    );
    return sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
});

export default router;
