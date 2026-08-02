import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.js';
import { UserModel } from '../../models/User.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { generateTokens, verifyRefreshToken, authenticate, AuthRequest } from '../../middlewares/auth.js';
import { otpService } from '../../services/otp/index.js';

const router = Router();

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

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string()
  })
});

// POST /api/auth/send-otp
router.post('/send-otp', validate(sendOtpSchema), async (req, res, next) => {
  try {
    const { phone } = req.body;
    const otp = '123456'; // Default dev OTP
    await otpService.sendOtp(phone, otp);
    return sendSuccess(res, { message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', validate(verifyOtpSchema), async (req, res, next) => {
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
