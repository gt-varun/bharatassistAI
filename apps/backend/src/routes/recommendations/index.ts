import { Router, Response, NextFunction } from 'express';
import type { Scheme } from '@bharatassist/shared-types';
import { sendSuccess, sendError } from '../../utils/response.js';
import { AuthRequest, authenticate, verifyAccessToken } from '../../middlewares/auth.js';
import { UserModel } from '../../models/User.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { EligibilityResultModel } from '../../models/EligibilityResult.js';
import { SavedSchemeModel } from '../../models/SavedScheme.js';
import { SchemeModel } from '../../models/Scheme.js';
import { searchSchemes, getSchemeBySlugOrId, localiseScheme } from '../../services/ai/retrievalService.js';
import { semanticSearch } from '../../services/ai/vectorSearch.js';
import { schemeIndexText } from '../../services/ai/embeddingProvider.js';
import { rankSchemes } from '../../services/recommendations/scoringService.js';
import { findCrossRecommendations } from '../../services/recommendations/crossRecommendationService.js';

const router = Router();

/** Same optional-auth pattern used by eligibility/ and assistant/ — populates
 * req.user from a valid Bearer token without ever rejecting the request. */
const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
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

/** How many citizens have saved each scheme — the popularity signal in soft scoring. */
async function popularityMap(): Promise<Map<string, number>> {
  const rows = await SavedSchemeModel.aggregate([{ $group: { _id: '$schemeId', count: { $sum: 1 } } }]);
  return new Map(rows.map((r: any) => [String(r._id), r.count as number]));
}

/**
 * GET /api/recommendations
 * Profile-based ranked recommendations: hard filters, then soft scoring,
 * always returned with the matched criteria that justified each one.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await CitizenProfileModel.findOne({ userId: req.user!.userId }).lean();
    if (!profile) {
      return sendSuccess(res, { recommendations: [], reason: 'no_profile' });
    }

    const lang = (req.query.lang as string) || req.user!.preferredLanguage || 'en';
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));

    // Candidate pool: same 50-record convention used by the eligibility
    // slice's alternative-scheme finder — plenty at register scale, and
    // hard-filtering + scoring below is what actually picks the winners.
    const { schemes } = await searchSchemes({ limit: 50 });
    const popularity = await popularityMap();

    const ranked = rankSchemes(schemes, profile as any, popularity).slice(0, limit);

    return sendSuccess(res, {
      recommendations: ranked.map((r) => ({
        scheme: localiseScheme(r.scheme, lang),
        score: Math.round(r.score * 100) / 100,
        matchedCriteria: r.matchedCriteria
      }))
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/recommendations/similar/:schemeId
 * "More like this" on a Scheme Details page — semantic neighbours of the
 * scheme's own indexed text, falling back to segment/state overlap when no
 * embeddings are indexed yet.
 */
router.get(
  '/similar/:schemeId',
  optionalAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lang = (req.query.lang as string) || req.user?.preferredLanguage;
      const base = await getSchemeBySlugOrId(req.params.schemeId, lang);
      if (!base) {
        return sendError(res, `Scheme not found for key: ${req.params.schemeId}`, 404, 'SCHEME_NOT_FOUND');
      }

      const limit = Math.min(8, Math.max(1, Number(req.query.limit) || 4));

      const hits = await semanticSearch(schemeIndexText(base), limit + 10);
      const candidateIds = hits.map((h) => h.schemeId).filter((id) => id !== String(base._id));

      let similar: Scheme[] = [];
      if (candidateIds.length) {
        const docs = await SchemeModel.find({
          _id: { $in: candidateIds },
          status: { $ne: 'closed' }
        }).lean();
        const byId = new Map(docs.map((d: any) => [String(d._id), d]));
        similar = candidateIds.map((id) => byId.get(id)).filter(Boolean) as unknown as Scheme[];
      }

      // No embeddings indexed yet (e.g. `pnpm embed` was never run on this
      // seed) — fall back to a real, if cruder, relevance signal instead of
      // an empty rail.
      if (similar.length === 0) {
        similar = (await SchemeModel.find({
          _id: { $ne: base._id },
          status: { $ne: 'closed' },
          $or: [{ targetSegments: { $in: base.targetSegments || [] } }, { state: base.state }]
        })
          .limit(limit)
          .lean()) as unknown as Scheme[];
      }

      const result = similar.slice(0, limit).map((s) => localiseScheme(s, lang));
      return sendSuccess(res, { schemes: result });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/recommendations/cross/:schemeId
 * "Because you're eligible for X, you may also qualify for Y" — only fires
 * once the citizen has a real, stored eligible/partially-eligible result for
 * this scheme (PRD §17.3 step triggered "after positive eligibility result").
 */
router.get('/cross/:schemeId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const base = await getSchemeBySlugOrId(req.params.schemeId);
    if (!base) {
      return sendError(res, `Scheme not found for key: ${req.params.schemeId}`, 404, 'SCHEME_NOT_FOUND');
    }

    const eligibility = await EligibilityResultModel.findOne({ userId, schemeId: base._id }).lean();
    if (!eligibility || eligibility.status === 'not_eligible') {
      return sendSuccess(res, { recommendations: [], reason: 'not_eligible_yet' });
    }

    const profile = await CitizenProfileModel.findOne({ userId }).lean();
    const recommendations = await findCrossRecommendations(base, (profile as any) ?? {});

    return sendSuccess(res, {
      recommendations,
      basedOn: { schemeId: String(base._id), schemeName: base.name, status: eligibility.status }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
