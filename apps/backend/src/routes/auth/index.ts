import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.js';
import { UserModel } from '../../models/User.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { generateTokens, verifyRefreshToken, authenticate, AuthRequest } from '../../middlewares/auth.js';
import { otpService } from '../../services/otp/index.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/** A reset link that never expires is a password that never changes. */
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const hashResetToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10)
  })
});

const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10),
    otp: z.string().length(6)
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string()
  })
});

const resetRequestSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

const resetConfirmSchema = z.object({
  body: z.object({
    token: z.string().min(16),
    password: z.string().min(6)
  })
});

// POST /api/auth/send-otp  (alias: /api/auth/otp/request — the name in the spec)
router.post(['/send-otp', '/otp/request'], validate(sendOtpSchema), async (req, res, next) => {
  try {
    const { phone } = req.body;
    const otp = crypto.randomInt(100000, 1000000).toString(); // Dynamic 6-digit OTP
    await otpService.sendOtp(phone, otp);
    return sendSuccess(res, { message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-otp  (alias: /api/auth/otp/verify)
router.post(['/verify-otp', '/otp/verify'], validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const isValid = await otpService.verifyOtp(phone, otp);
    if (!isValid) {
      return sendError(res, 'Invalid or expired OTP', 400, 'INVALID_OTP');
    }

    let user = await UserModel.findOne({ phone });
    if (!user) {
      user = await UserModel.create({
        phone,
        preferredLanguage: 'en',
        refreshTokenVersion: 0
      });
    }

    const tokens = generateTokens(user);
    return sendSuccess(res, { user, ...tokens });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user || !user.passwordHash) {
      return sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const tokens = generateTokens(user);
    return sendSuccess(res, { user, ...tokens });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return sendError(res, 'Email already in use', 400, 'USER_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await UserModel.create({
      email,
      passwordHash,
      preferredLanguage: 'en',
      refreshTokenVersion: 0
    });

    const tokens = generateTokens(user);
    return sendSuccess(res, { user, ...tokens });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const payload = verifyRefreshToken(refreshToken);
    const user = await UserModel.findById(payload.userId);

    if (!user || user.refreshTokenVersion !== payload.refreshTokenVersion) {
      return sendError(res, 'Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    // Refresh Token Rotation: Increment refreshTokenVersion
    user.refreshTokenVersion += 1;
    await user.save();

    const tokens = generateTokens(user);
    return sendSuccess(res, tokens);
  } catch (error) {
    return sendError(res, 'Invalid or expired refresh token', 401, 'INVALID_TOKEN');
  }
});

// POST /api/auth/password/reset/request
router.post('/password/reset/request', validate(resetRequestSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });

    // Answer identically whether or not the address is registered: the reply
    // to this endpoint must not become a way to enumerate our users.
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashResetToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      // No mail provider is wired up yet, so the token goes to the logs the
      // same way OTPs do. Swap this line for the mailer when one exists.
      logger.info({ email: '[REDACTED_PII]' }, `[PasswordReset] reset token: ${token}`);
    }

    return sendSuccess(res, {
      message: 'If that email is registered, a reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/password/reset/confirm
router.post('/password/reset/confirm', validate(resetConfirmSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = await UserModel.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return sendError(res, 'Reset link is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    // Changing the password signs out every other device, per §3.2.
    user.refreshTokenVersion += 1;
    await user.save();

    const tokens = generateTokens(user);
    return sendSuccess(res, { user, ...tokens });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user) {
      const user = await UserModel.findById(req.user.userId);
      if (user) {
        user.refreshTokenVersion += 1;
        await user.save();
      }
    }
    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
