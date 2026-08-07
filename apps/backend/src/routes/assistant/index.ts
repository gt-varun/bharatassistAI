import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess, sendError } from '../../utils/response.js';
import { AuthRequest, authenticate, verifyAccessToken } from '../../middlewares/auth.js';
import { UserModel } from '../../models/User.js';
import {
  handleAssistantMessage,
  listConversations,
  getConversationById
} from '../../services/assistant/conversationService.js';

const router = Router();

/**
 * Optional authentication: populates `req.user` from a valid Bearer token but
 * never rejects the request. The AI Assistant answers guests too (per
 * docs/prd.md §11.10) — only conversation *persistence* requires a real user.
 * Mirrors the same pattern used in routes/eligibility/index.ts.
 */
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

const messageSchema = z.object({
  message: z.string().trim().min(1, 'message is required').max(2000),
  schemeId: z.string().trim().min(1).optional(),
  conversationId: z.string().trim().min(1).optional(),
  language: z.string().trim().min(2).max(5).optional()
});

/**
 * POST /api/assistant/message
 * Grounded RAG turn: retrieves real scheme records, answers only from them,
 * and persists the turn (with sourceSchemeIds) for logged-in users.
 */
router.post('/message', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.issues[0]?.message || 'Invalid request', 400, 'BAD_REQUEST');
    }

    const language = parsed.data.language || req.user?.preferredLanguage || 'en';

    const result = await handleAssistantMessage({
      message: parsed.data.message,
      schemeId: parsed.data.schemeId,
      conversationId: parsed.data.conversationId,
      userId: req.user?.userId,
      language
    });

    return sendSuccess(res, {
      conversationId: result.conversationId,
      message: {
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        sourceSchemeIds: result.sourceSchemeIds
      },
      sources: result.sources,
      noMatch: result.noMatch,
      intent: result.intent,
      // Debug/audit metadata for this turn — not persisted, only returned
      // live (services/assistant/conversationService.ts).
      explainability: result.explainability
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/assistant/conversations
 * Recent conversation summaries for the logged-in citizen. Guest sessions
 * are never persisted, so this always requires a real session.
 */
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const conversations = await listConversations(req.user!.userId, Number.isFinite(limit) ? limit : 20);
    return sendSuccess(res, { conversations });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/assistant/conversations/:id
 * Full message history for one conversation, scoped to its owner.
 */
router.get(
  '/conversations/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const conversation = await getConversationById(req.user!.userId, req.params.id);
      if (!conversation) {
        return sendError(res, 'Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
      }
      return sendSuccess(res, conversation);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
