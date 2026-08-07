import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { SavedSchemeModel } from '../../models/SavedScheme.js';
import { SchemeModel } from '../../models/Scheme.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

const STATUSES = ['saved', 'eligibility_checked', 'application_in_progress', 'applied'] as const;

/**
 * The browser knows schemes by slug; the database keys them by ObjectId. Both
 * are accepted so callers never have to resolve a record just to bookmark it.
 */
const schemeRefSchema = z
  .object({
    schemeId: z.string().optional(),
    slug: z.string().optional()
  })
  .refine((body) => Boolean(body.schemeId || body.slug), {
    message: 'Provide either schemeId or slug'
  });

const createSchema = z.object({
  body: schemeRefSchema.and(z.object({ status: z.enum(STATUSES).optional() }))
});

const patchSchema = z.object({
  body: z.object({ status: z.enum(STATUSES) }),
  params: z.object({ ref: z.string().min(1) })
});

/** Resolves a slug or an id to a scheme `_id`, or null if no such scheme. */
async function resolveSchemeId(ref: string): Promise<string | null> {
  if (mongoose.isValidObjectId(ref)) {
    const byId = await SchemeModel.findById(ref).select('_id');
    if (byId) return byId._id.toString();
  }
  const bySlug = await SchemeModel.findOne({ slug: ref }).select('_id');
  return bySlug ? bySlug._id.toString() : null;
}

// GET /api/saved — the whole list, each entry carrying its scheme record.
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const filter: Record<string, unknown> = { userId: req.user?.userId };
    const status = req.query.status as string | undefined;
    if (status && (STATUSES as readonly string[]).includes(status)) {
      filter.status = status;
    }

    const saved = await SavedSchemeModel.find(filter).sort({ savedAt: -1 }).populate('schemeId');
    return sendSuccess(res, saved);
  } catch (error) {
    next(error);
  }
});

// POST /api/saved — bookmark a scheme. Saving twice is not an error.
router.post('/', authenticate, validate(createSchema), async (req: AuthRequest, res, next) => {
  try {
    const ref = (req.body.schemeId as string) || (req.body.slug as string);
    const schemeId = await resolveSchemeId(ref);
    if (!schemeId) return sendError(res, 'Scheme not found', 404, 'NOT_FOUND');

    const saved = await SavedSchemeModel.findOneAndUpdate(
      { userId: req.user?.userId, schemeId },
      {
        $setOnInsert: {
          userId: req.user?.userId,
          schemeId,
          status: req.body.status ?? 'saved',
          savedAt: new Date()
        }
      },
      { new: true, upsert: true }
    ).populate('schemeId');

    return sendSuccess(res, saved, 201);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/saved/:ref — move a saved scheme along its status track.
router.patch('/:ref', authenticate, validate(patchSchema), async (req: AuthRequest, res, next) => {
  try {
    const schemeId = await resolveSchemeId(req.params.ref);
    if (!schemeId) return sendError(res, 'Scheme not found', 404, 'NOT_FOUND');

    const saved = await SavedSchemeModel.findOneAndUpdate(
      { userId: req.user?.userId, schemeId },
      { status: req.body.status },
      { new: true }
    ).populate('schemeId');

    if (!saved) return sendError(res, 'That scheme is not in your saved list', 404, 'NOT_FOUND');
    return sendSuccess(res, saved);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/saved/:ref — remove a bookmark.
router.delete('/:ref', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schemeId = await resolveSchemeId(req.params.ref);
    if (!schemeId) return sendError(res, 'Scheme not found', 404, 'NOT_FOUND');

    const result = await SavedSchemeModel.deleteOne({ userId: req.user?.userId, schemeId });
    if (result.deletedCount === 0) {
      return sendError(res, 'That scheme is not in your saved list', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, { message: 'Removed from saved schemes' });
  } catch (error) {
    next(error);
  }
});

export default router;
