import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app.js';
import { UserModel } from '../../models/User.js';
import { otpService } from '../../services/otp/index.js';
import { generateTokens } from '../../middlewares/auth.js';

vi.mock('../../models/User.js', () => ({
  UserModel: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../../services/otp/index.js', () => ({
  otpService: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn()
  }
}));

describe('Auth Routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/otp/request (and /send-otp)', () => {
    it('requests an OTP successfully for valid phone', async () => {
      vi.mocked(otpService.sendOtp).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/otp/request')
        .send({ phone: '9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(otpService.sendOtp).toHaveBeenCalledWith('9876543210', expect.any(String));
    });

    it('rejects invalid phone number with 400', async () => {
      const res = await request(app)
        .post('/api/auth/otp/request')
        .send({ phone: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/otp/verify (and /verify-otp)', () => {
    it('verifies valid OTP and logs in or creates user', async () => {
      vi.mocked(otpService.verifyOtp).mockResolvedValue(true);
      const mockUser = {
        _id: '665f1a2b3c4d5e6f7a8b9099',
        phone: '9876543210',
        preferredLanguage: 'en',
        refreshTokenVersion: 0,
        save: vi.fn()
      };
      vi.mocked(UserModel.findOne).mockResolvedValue(mockUser as any);

      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '9876543210', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.phone).toBe('9876543210');
    });

    it('fails when OTP is invalid', async () => {
      vi.mocked(otpService.verifyOtp).mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone: '9876543210', otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OTP');
    });
  });

  describe('POST /api/auth/register and /login', () => {
    it('registers new email and password', async () => {
      vi.mocked(UserModel.findOne).mockResolvedValue(null);
      const mockUser = {
        _id: '665f1a2b3c4d5e6f7a8b9098',
        email: 'citizen@example.com',
        refreshTokenVersion: 0
      };
      vi.mocked(UserModel.create).mockResolvedValue(mockUser as any);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'citizen@example.com', password: 'secretpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe('citizen@example.com');
    });

    it('logs in with email and password', async () => {
      const passwordHash = await bcrypt.hash('secretpassword123', 10);
      const mockUser = {
        _id: '665f1a2b3c4d5e6f7a8b9098',
        email: 'citizen@example.com',
        passwordHash,
        refreshTokenVersion: 0
      };
      vi.mocked(UserModel.findOne).mockResolvedValue(mockUser as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'citizen@example.com', password: 'secretpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('rejects login with wrong password', async () => {
      const passwordHash = await bcrypt.hash('secretpassword123', 10);
      const mockUser = {
        _id: '665f1a2b3c4d5e6f7a8b9098',
        email: 'citizen@example.com',
        passwordHash,
        refreshTokenVersion: 0
      };
      vi.mocked(UserModel.findOne).mockResolvedValue(mockUser as any);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'citizen@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/refresh and /logout', () => {
    it('rotates refresh token and issues new tokens', async () => {
      const mockUser = {
        _id: '665f1a2b3c4d5e6f7a8b9098',
        refreshTokenVersion: 0,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);

      const tokens = generateTokens(mockUser);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(mockUser.refreshTokenVersion).toBe(1);
    });

    it('logs out by invalidating refresh token version', async () => {
      const mockUser = {
        _id: '665f1a2b3c4d5e6f7a8b9098',
        phone: '9876543210',
        email: null,
        preferredLanguage: 'en',
        refreshTokenVersion: 1,
        save: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);

      const tokens = generateTokens(mockUser);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUser.refreshTokenVersion).toBe(2);
    });
  });
});
