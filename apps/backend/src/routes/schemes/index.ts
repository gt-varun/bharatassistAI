import { Router } from 'express';
import { SchemeModel } from '../../models/Scheme.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

// GET /api/schemes - list schemes with optional category/search filters
router.get('/', async (req, res, next) => {
  try {
    const { segment, state, q } = req.query;
    const query: any = {};
    if (segment) query.targetSegments = segment;
    if (state) query.state = state;
    if (q) {
      query.$text = { $search: String(q) };
    }

    const schemes = await SchemeModel.find(query).limit(50);
    return sendSuccess(res, schemes);
  } catch (error) {
    next(error);
  }
});

// GET /api/schemes/:idOrSlug - scheme details by ID or slug
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const scheme = isObjectId
      ? await SchemeModel.findById(idOrSlug)
      : await SchemeModel.findOne({ slug: idOrSlug });

    if (!scheme) {
      return sendError(res, 'Scheme not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, scheme);
  } catch (error) {
    next(error);
  }
});

export default router;
