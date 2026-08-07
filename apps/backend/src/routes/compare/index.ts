import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response.js';
import { getSchemeBySlugOrId } from '../../services/ai/retrievalService.js';
import { compareSchemesList } from '../../services/compare/compareSchemes.js';

const router = Router();

/**
 * POST /api/compare
 * Accepts 2–4 scheme IDs or slugs, normalizes comparison attributes,
 * and highlights side-by-side differences.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schemeIds } = req.body;

    if (!Array.isArray(schemeIds)) {
      return sendError(
        res,
        'schemeIds must be an array of 2 to 4 scheme IDs or slugs',
        400,
        'BAD_REQUEST'
      );
    }

    // Validation Rule: Must compare between 2 and 4 schemes
    if (schemeIds.length < 2 || schemeIds.length > 4) {
      return sendError(
        res,
        `Comparison requires between 2 and 4 schemes (received: ${schemeIds.length})`,
        400,
        'BAD_REQUEST'
      );
    }

    // Validation Rule: Reject duplicate scheme IDs
    const uniqueIds = new Set(schemeIds.map((id) => String(id).trim().toLowerCase()));
    if (uniqueIds.size !== schemeIds.length) {
      return sendError(
        res,
        'Duplicate scheme IDs in comparison request are not allowed',
        400,
        'BAD_REQUEST'
      );
    }

    // Load scheme records in parallel via shared retrieval service
    const schemes = await Promise.all(
      schemeIds.map((id) => getSchemeBySlugOrId(String(id).trim()))
    );

    // Verify all schemes exist
    const missingIndex = schemes.findIndex((s) => !s);
    if (missingIndex !== -1) {
      return sendError(
        res,
        `Scheme not found for key: '${schemeIds[missingIndex]}'`,
        404,
        'SCHEME_NOT_FOUND'
      );
    }

    // Execute comparison logic
    const comparisonResult = compareSchemesList(schemes.filter(Boolean) as any);

    return sendSuccess(res, comparisonResult);
  } catch (error) {
    return next(error);
  }
});

export default router;
