import { Router, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response.js';
import { AuthRequest, verifyAccessToken } from '../../middlewares/auth.js';
import { UserModel } from '../../models/User.js';
import { getSchemeBySlugOrId } from '../../services/ai/retrievalService.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { generateApplicationGuidance } from '../../services/guidance/applicationGuidanceGenerator.js';

const router = Router();

/**
 * Optional authentication middleware:
 * Populates `req.user` if a valid Bearer token is provided.
 * Gracefully falls back to guest session if token is missing, expired, or invalid.
 */
const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyAccessToken(token);
      const user = await UserModel.findById(payload.userId);
      if (user) {
        req.user = {
          userId: user._id.toString(),
          phone: user.phone,
          email: user.email,
          preferredLanguage: user.preferredLanguage
        };
      }
    } catch {
      req.user = undefined;
    }
  }
  return next();
};

/**
 * GET /api/guidance/:schemeId
 * Returns field-by-field form guidance, common rejection mistakes, dynamic glossary,
 * validated official portal link, and readyToApply status for a scheme.
 */
router.get(
  '/:schemeId',
  optionalAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { schemeId } = req.params;
      if (!schemeId || schemeId.trim() === '') {
        return sendError(res, 'Scheme identifier is required', 400, 'BAD_REQUEST');
      }

      // Load Scheme record from shared retrieval service
      const scheme = await getSchemeBySlugOrId(schemeId);
      if (!scheme) {
        return sendError(res, `Scheme not found for key: ${schemeId}`, 404, 'SCHEME_NOT_FOUND');
      }

      // Load CitizenProfile if user is authenticated
      let profile = null;
      if (req.user?.userId) {
        profile = await CitizenProfileModel.findOne({ userId: req.user.userId }).lean();
      }

      // Generate application guidance
      const guidance = generateApplicationGuidance(scheme, profile);

      return sendSuccess(res, {
        schemeId: String(scheme._id || scheme.slug),
        schemeName: scheme.name,
        fieldByFieldGuidance: guidance.fieldByFieldGuidance,
        commonMistakes: guidance.commonMistakes,
        glossary: guidance.glossary,
        officialPortalUrl: guidance.officialPortalUrl,
        portalValid: guidance.portalValid,
        readyToApply: guidance.readyToApply,
        ...(guidance.notes ? { notes: guidance.notes } : {})
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
