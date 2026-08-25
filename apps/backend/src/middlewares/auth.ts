import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';
import { UserModel } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    phone: string | null;
    email: string | null;
    preferredLanguage: string;
  };
}

interface JwtPayload {
  userId: string;
  refreshTokenVersion?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_access_secret_key_32_chars_minimum';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_32_chars_min';

export const generateTokens = (user: { _id: string | object; refreshTokenVersion: number }) => {
  const userId = user._id.toString();
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(
    { userId, refreshTokenVersion: user.refreshTokenVersion },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authorization token missing', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      sendError(res, 'User not found', 401, 'UNAUTHORIZED');
      return;
    }

    req.user = {
      userId: user._id.toString(),
      phone: user.phone,
      email: user.email,
      preferredLanguage: user.preferredLanguage
    };
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired token', 401, 'UNAUTHORIZED');
  }
};

/**
 * Optional authentication middleware:
 * Populates `req.user` if a valid Bearer token is provided.
 * Gracefully falls back to guest session if token is missing, expired, or invalid.
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
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
  next();
};
