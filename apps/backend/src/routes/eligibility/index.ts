import { Router, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response.js';
import { optionalAuth, AuthRequest } from '../../middlewares/auth.js';
import { UserModel } from '../../models/User.js';
import { getSchemeBySlugOrId } from '../../services/ai/retrievalService.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { EligibilityResultModel } from '../../models/EligibilityResult.js';
import { generateEligibilityQuestions } from '../../services/eligibility/questionGenerator.js';
import { evaluateEligibility } from '../../services/eligibility/ruleEngine.js';
import {
  findAlternativeSchemes,
  AlternativeSchemeRecommendation
} from '../../services/eligibility/alternativeSchemeFinder.js';

const router = Router();

/**
 * GET /api/eligibility/:schemeId/questions
 * Returns dynamic, scheme-specific eligibility questions.
 * Pre-fills answers with citizen profile data if authenticated.
 */
router.get(
  '/:schemeId/questions',
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

      // Load CitizenProfile if authenticated
      let profile = null;
      if (req.user?.userId) {
        profile = await CitizenProfileModel.findOne({ userId: req.user.userId }).lean();
      }

      // Generate questions (pre-filled if profile is present)
      const questions = generateEligibilityQuestions(
        scheme.eligibilityRules,
        profile ?? undefined
      );

      return sendSuccess(res, {
        schemeId: String(scheme._id || scheme.slug),
        schemeName: scheme.name,
        questions
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/eligibility/:schemeId/evaluate
 * Evaluates submitted answers against scheme eligibility rules deterministically.
 * Suggests alternative schemes if not eligible.
 * Persists evaluation outcome to `eligibilityResults` collection if authenticated.
 */
router.post(
  '/:schemeId/evaluate',
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

      // Extract submitted answers from request body
      const answers = req.body?.answers ?? req.body;
      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        return sendError(res, 'Valid submitted answers object is required', 400, 'BAD_REQUEST');
      }

      // Load CitizenProfile if user is authenticated
      let profile: Record<string, any> = {};
      if (req.user?.userId) {
        const dbProfile = await CitizenProfileModel.findOne({ userId: req.user.userId }).lean();
        if (dbProfile) {
          profile = dbProfile;
        }
      }

      // Merge user profile with submitted answers (answers override profile values)
      const mergedInput = {
        ...profile,
        ...answers
      };

      // Run deterministic rule engine
      const evalResult = evaluateEligibility(scheme.eligibilityRules, mergedInput);

      // Search alternative schemes if not fully eligible
      let alternativeSchemes: AlternativeSchemeRecommendation[] = [];
      if (evalResult.status !== 'eligible') {
        alternativeSchemes = await findAlternativeSchemes(scheme, mergedInput, evalResult);
      }

      // Persist outcome in eligibilityResults collection if user is authenticated
      if (req.user?.userId && scheme._id) {
        const altObjectIds = alternativeSchemes
          .map((alt) => alt.schemeId)
          .filter((id) => id.match(/^[0-9a-fA-F]{24}$/));

        await EligibilityResultModel.findOneAndUpdate(
          { userId: req.user.userId, schemeId: scheme._id },
          {
            userId: req.user.userId,
            schemeId: scheme._id,
            status: evalResult.status,
            reasons: evalResult.reasons,
            missingRequirements: evalResult.missingRequirements,
            alternativeSchemeIds: altObjectIds,
            answeredAt: new Date()
          },
          { upsert: true, new: true }
        );
      }

      return sendSuccess(res, {
        schemeId: String(scheme._id || scheme.slug),
        schemeName: scheme.name,
        status: evalResult.status,
        reasons: evalResult.reasons,
        missingRequirements: evalResult.missingRequirements,
        alternativeSchemes
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
