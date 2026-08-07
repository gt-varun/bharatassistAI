import { Router, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticate, AuthRequest, verifyAccessToken } from '../../middlewares/auth.js';
import { UserModel } from '../../models/User.js';
import { getSchemeBySlugOrId } from '../../services/ai/retrievalService.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { EligibilityResultModel } from '../../models/EligibilityResult.js';
import { DocumentChecklistModel } from '../../models/DocumentChecklist.js';
import { generatePersonalizedChecklist } from '../../services/checklist/checklistGenerator.js';

const router = Router();

const ALLOWED_STATUSES = new Set(['have', 'missing', 'required', 'pending', 'completed']);

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
 * GET /api/checklist/:schemeId
 * Returns personalized document checklist for a scheme.
 * Preserves existing user progress if authenticated and updates MongoDB persistence.
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

      let profile = null;
      let eligibilityResult = null;
      let existingChecklist = null;

      // Load DB records if authenticated
      if (req.user?.userId && scheme._id) {
        const [dbProfile, dbEligibility, dbChecklist] = await Promise.all([
          CitizenProfileModel.findOne({ userId: req.user.userId }).lean(),
          EligibilityResultModel.findOne({
            userId: req.user.userId,
            schemeId: scheme._id
          }).lean(),
          DocumentChecklistModel.findOne({
            userId: req.user.userId,
            schemeId: scheme._id
          }).lean()
        ]);

        profile = dbProfile;
        eligibilityResult = dbEligibility;
        existingChecklist = dbChecklist;
      }

      // Generate base personalized checklist
      const generatedItems = generatePersonalizedChecklist(scheme, profile, eligibilityResult);

      // Preserve existing user-modified item statuses if existing checklist exists
      const existingStatusMap = new Map<string, string>();
      if (existingChecklist && Array.isArray(existingChecklist.items)) {
        for (const item of existingChecklist.items) {
          if (item.label && item.status) {
            existingStatusMap.set(item.label.toLowerCase(), item.status);
          }
        }
      }

      const finalItems = generatedItems.map((item) => {
        const userStatus = existingStatusMap.get(item.label.toLowerCase());
        return {
          ...item,
          status: (userStatus as any) || item.status
        };
      });

      // Persist to documentChecklists collection if user is authenticated
      if (req.user?.userId && scheme._id) {
        const dbItems = finalItems.map((item) => ({
          label: item.label,
          status:
            item.status === 'completed' || item.status === 'have'
              ? 'have'
              : item.status === 'missing'
                ? 'missing'
                : 'required',
          howToObtain: item.howToObtain
        }));

        await DocumentChecklistModel.findOneAndUpdate(
          { userId: req.user.userId, schemeId: scheme._id },
          {
            userId: req.user.userId,
            schemeId: scheme._id,
            items: dbItems
          },
          { upsert: true, new: true }
        );
      }

      return sendSuccess(res, {
        schemeId: String(scheme._id || scheme.slug),
        schemeName: scheme.name,
        items: finalItems
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PATCH /api/checklist/:schemeId
 * Updates status for specific checklist items for an authenticated user.
 * Preserves all unmentioned items.
 */
router.patch(
  '/:schemeId',
  authenticate,
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

      const updates = req.body?.items;
      if (!Array.isArray(updates) || updates.length === 0) {
        return sendError(res, 'An array of items with label and status is required', 400, 'BAD_REQUEST');
      }

      // Validation Rule: Ensure each update item specifies a valid label and allowed status enum
      for (const item of updates) {
        if (!item.label || typeof item.label !== 'string' || item.label.trim() === '') {
          return sendError(res, 'Each update item must specify a valid string label', 400, 'BAD_REQUEST');
        }
        if (
          !item.status ||
          typeof item.status !== 'string' ||
          !ALLOWED_STATUSES.has(item.status.toLowerCase())
        ) {
          return sendError(
            res,
            `Invalid status '${item.status}' for item '${item.label}'. Allowed values: have, missing, required, pending, completed`,
            400,
            'BAD_REQUEST'
          );
        }
      }

      const userId = req.user?.userId;
      if (!userId || !scheme._id) {
        return sendError(res, 'User authentication required', 401, 'UNAUTHORIZED');
      }

      // Load existing DocumentChecklist or generate base checklist if non-existent
      const existingChecklist = await DocumentChecklistModel.findOne({
        userId,
        schemeId: scheme._id
      });

      let currentItems: Array<{ label: string; status: string; howToObtain: string }> = [];

      if (existingChecklist && Array.isArray(existingChecklist.items) && existingChecklist.items.length > 0) {
        currentItems = existingChecklist.items.map((i) => ({
          label: i.label,
          status: i.status,
          howToObtain: i.howToObtain
        }));
      } else {
        const [profile, eligibilityResult] = await Promise.all([
          CitizenProfileModel.findOne({ userId }).lean(),
          EligibilityResultModel.findOne({ userId, schemeId: scheme._id }).lean()
        ]);
        const generated = generatePersonalizedChecklist(scheme, profile, eligibilityResult);
        currentItems = generated.map((g) => ({
          label: g.label,
          status: g.status,
          howToObtain: g.howToObtain
        }));
      }

      // Map status updates by lowercase item label
      const updateMap = new Map<string, string>();
      for (const item of updates) {
        updateMap.set(item.label.toLowerCase(), item.status.toLowerCase());
      }

      // Apply updates to target items while preserving all non-targeted items
      const updatedItems = currentItems.map((item) => {
        const newStatus = updateMap.get(item.label.toLowerCase());
        return {
          ...item,
          status: newStatus || item.status
        };
      });

      // Map items for MongoDB schema enum storage
      const dbItems = updatedItems.map((item) => ({
        label: item.label,
        status:
          item.status === 'completed' || item.status === 'have'
            ? 'have'
            : item.status === 'missing'
              ? 'missing'
              : 'required',
        howToObtain: item.howToObtain
      }));

      // Update database record
      await DocumentChecklistModel.findOneAndUpdate(
        { userId, schemeId: scheme._id },
        {
          userId,
          schemeId: scheme._id,
          items: dbItems
        },
        { upsert: true, new: true }
      );

      return sendSuccess(res, {
        schemeId: String(scheme._id || scheme.slug),
        schemeName: scheme.name,
        items: updatedItems
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
