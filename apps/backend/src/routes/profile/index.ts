import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { UserModel } from '../../models/User.js';
import { SavedSchemeModel } from '../../models/SavedScheme.js';
import { EligibilityResultModel } from '../../models/EligibilityResult.js';
import { DocumentChecklistModel } from '../../models/DocumentChecklist.js';
import { ConversationModel } from '../../models/Conversation.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

/** Fields a citizen may set on themselves. Anything else in the body is dropped. */
const PROFILE_FIELDS = [
  'fullName',
  'state',
  'district',
  'age',
  'gender',
  'occupationCategory',
  'incomeBand',
  'educationLevel',
  'category',
  'disabilityStatus',
  'maritalStatus',
  'landOwnershipAcres',
  'businessType'
] as const;

const settingsSchema = z.object({
  body: z.object({
    preferredLanguage: z.string().min(2).max(8).optional(),
    notificationsEnabled: z.boolean().optional()
  })
});

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
    // Whitelist rather than spread: `userId` and `_id` arriving in the body
    // would otherwise let one account write over another's profile.
    const update: Record<string, unknown> = {};
    for (const field of PROFILE_FIELDS) {
      if (field in req.body) update[field] = req.body[field];
    }

    const profile = await CitizenProfileModel.findOneAndUpdate(
      { userId: req.user?.userId },
      { ...update, userId: req.user?.userId },
      { new: true, upsert: true }
    );
    return sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
});

/** GET /api/profile/settings — the account row behind the settings screen. */
router.get('/settings', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.user?.userId);
    if (!user) return sendError(res, 'User not found', 404, 'NOT_FOUND');
    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/profile/settings — language preference and notification opt-out. */
router.patch('/settings', authenticate, validate(settingsSchema), async (req: AuthRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.user?.userId);
    if (!user) return sendError(res, 'User not found', 404, 'NOT_FOUND');

    if (typeof req.body.preferredLanguage === 'string') {
      user.preferredLanguage = req.body.preferredLanguage;
    }
    if (typeof req.body.notificationsEnabled === 'boolean') {
      user.notificationsEnabled = req.body.notificationsEnabled;
    }
    await user.save();

    return sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profile/export — DPDP Act §11 data portability.
 * Everything held against this account, in one machine-readable file.
 */
router.get('/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    const [user, profile, saved, eligibility, checklists, conversations] = await Promise.all([
      UserModel.findById(userId),
      CitizenProfileModel.findOne({ userId }),
      SavedSchemeModel.find({ userId }).populate('schemeId', 'name slug'),
      EligibilityResultModel.find({ userId }),
      DocumentChecklistModel.find({ userId }),
      ConversationModel.find({ userId })
    ]);

    if (!user) return sendError(res, 'User not found', 404, 'NOT_FOUND');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="bharatassist-my-data.json"');

    return sendSuccess(res, {
      exportedAt: new Date().toISOString(),
      account: user,
      profile,
      savedSchemes: saved,
      eligibilityResults: eligibility,
      documentChecklists: checklists,
      conversations
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/profile — DPDP Act right to erasure.
 * Removes the account and everything attached to it, not just the profile row.
 */
router.delete('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.userId;
    await Promise.all([
      CitizenProfileModel.deleteOne({ userId }),
      SavedSchemeModel.deleteMany({ userId }),
      EligibilityResultModel.deleteMany({ userId }),
      DocumentChecklistModel.deleteMany({ userId }),
      ConversationModel.deleteMany({ userId })
    ]);
    // The account row goes last: while it exists the tokens still work, so a
    // failure part-way through leaves an account the citizen can retry from
    // rather than an orphaned login with dangling data.
    await UserModel.deleteOne({ _id: userId });

    return sendSuccess(res, { message: 'Account and all associated data deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
