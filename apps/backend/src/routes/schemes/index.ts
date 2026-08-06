import { Router, Request, Response, NextFunction } from 'express';
import {
  searchSchemes,
  getCategoryCounts,
  getSchemeBySlugOrId,
  SearchParams
} from '../../services/ai/retrievalService.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

/** The reader's language: explicit ?lang wins, else Accept-Language. */
function readLang(req: Request): string | undefined {
  const q = req.query.lang as string | undefined;
  if (q) return q.split('-')[0].toLowerCase();
  const header = req.headers['accept-language'];
  if (!header) return undefined;
  return header.split(',')[0]?.split('-')[0]?.toLowerCase();
}

/**
 * GET /api/schemes/search
 * Keyword + natural-language + structured filter search
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: SearchParams = {
      query: req.query.q as string,
      level: req.query.level as 'central' | 'state',
      state: req.query.state as string,
      segment: req.query.segment as string,
      benefitType: req.query.benefitType as any,
      incomeBand: req.query.incomeBand as string,
      department: req.query.department as string,
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
      userId: (req as any).user?.id,
      lang: readLang(req)
    };

    const result = await searchSchemes(params);
    return sendSuccess(res, result.schemes, 200, { pagination: result.pagination });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/schemes/categories
 * Live scheme count per category segment/benefitType/state
 */
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await getCategoryCounts();
    return sendSuccess(res, categories);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/schemes/categories/:slug
 * Category-filtered scheme listing
 */
router.get('/categories/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await searchSchemes({
      segment: slug,
      page,
      limit,
      lang: readLang(req)
    });

    return sendSuccess(res, result.schemes, 200, { pagination: result.pagination });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/schemes/:slug
 * Full scheme detail record by slug or ObjectId
 */
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const scheme = await getSchemeBySlugOrId(slug, readLang(req));

    if (!scheme) {
      return sendError(res, `Scheme not found for key: ${slug}`, 404, 'SCHEME_NOT_FOUND');
    }

    return sendSuccess(res, scheme);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/schemes
 * Paginated list of schemes
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: SearchParams = {
      query: req.query.q as string,
      level: req.query.level as any,
      state: req.query.state as string,
      segment: req.query.segment as string,
      benefitType: req.query.benefitType as any,
      incomeBand: req.query.incomeBand as string,
      department: req.query.department as string,
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
      lang: readLang(req)
    };

    const result = await searchSchemes(params);
    return sendSuccess(res, result.schemes, 200, { pagination: result.pagination });
  } catch (err) {
    return next(err);
  }
});

export default router;
