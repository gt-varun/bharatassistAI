import { Router, raw } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, AuthRequest } from '../../middlewares/auth.js';
import {
  isTranscriptionConfigured,
  transcribeAudio,
  TranscriptionUnavailableError
} from '../../services/voice/transcription.js';
import { logger } from '../../utils/logger.js';
import { sendSuccess, sendError } from '../../utils/response.js';

const router = Router();

/**
 * Speech recognition for devices that cannot do it themselves.
 *
 * Every request is a paid call to a provider and carries a recording of
 * someone's voice, so this route is deliberately narrow: signed in, rate
 * limited, size capped, and it stores nothing. The audio exists only for the
 * duration of the request.
 */

/** Roughly a minute of Opus. A question to the assistant is far shorter. */
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;

const voiceRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60, // a real user speaks a handful of times, not sixty
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many voice requests. Please wait a moment.' }
  }
});

/**
 * GET /api/voice/capabilities — can the server hear?
 *
 * The client asks before it offers a microphone, so a deployment without a
 * key shows no dead button. Cheap, and it means the answer lives in one
 * place instead of being inferred from a failed recording.
 */
router.get('/capabilities', authenticate, (_req, res) =>
  sendSuccess(res, { transcription: isTranscriptionConfigured() })
);

router.post(
  '/transcribe',
  authenticate,
  voiceRateLimiter,
  // The body is audio, not JSON. Accepting the raw bytes avoids the ~33%
  // that base64 would add to every upload on a rural connection.
  raw({ type: ['audio/*', 'application/octet-stream'], limit: MAX_AUDIO_BYTES }),
  async (req: AuthRequest, res) => {
    try {
      const audio = req.body as Buffer;
      if (!Buffer.isBuffer(audio) || audio.length === 0) {
        return sendError(res, 'No audio was received.', 400, 'NO_AUDIO');
      }

      const language = typeof req.query.lang === 'string' ? req.query.lang : undefined;
      const text = await transcribeAudio(audio, {
        language,
        mimeType: req.headers['content-type'] ?? 'audio/webm'
      });

      if (!text) {
        return sendSuccess(res, { text: '', heard: false });
      }
      return sendSuccess(res, { text, heard: true });
    } catch (error) {
      if (error instanceof TranscriptionUnavailableError) {
        return sendError(res, error.message, 503, 'VOICE_UNAVAILABLE');
      }
      logger.warn({ error }, 'Voice transcription failed');
      return sendError(res, 'Could not understand the recording.', 502, 'TRANSCRIPTION_FAILED');
    }
  }
);

export default router;
