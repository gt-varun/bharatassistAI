import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { UserModel } from '../../models/User.js';
import { SavedSchemeModel } from '../../models/SavedScheme.js';
import { SchemeModel } from '../../models/Scheme.js';
import { generateTokens } from '../../middlewares/auth.js';

vi.mock('../../models/User.js', () => ({
  UserModel: {
    findById: vi.fn()
  }
}));

vi.mock('../../models/SavedScheme.js', () => ({
  SavedSchemeModel: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn()
  }
}));

vi.mock('../../models/Scheme.js', () => ({
  SchemeModel: {
    findById: vi.fn(),
    findOne: vi.fn()
  }
}));

describe('Saved Schemes Routes', () => {
  const app = createApp();
  const userId = '665f1a2b3c4d5e6f7a8b9098';
  const schemeId = '665f1a2b3c4d5e6f7a8b9001';
  const mockUser = {
    _id: userId,
    phone: '9876543210',
    preferredLanguage: 'en',
    refreshTokenVersion: 0
  };

  const tokens = generateTokens(mockUser);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);
  });

  describe('GET /api/saved', () => {
    it('returns saved schemes for user', async () => {
      const mockSaved = [
        {
          _id: 'saved-1',
          userId,
          schemeId: { _id: schemeId, slug: 'karnataka-vidyasiri-scholarship', name: 'Vidyasiri' },
          status: 'saved',
          savedAt: new Date()
        }
      ];

      vi.mocked(SavedSchemeModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockSaved)
        })
      } as any);

      const res = await request(app)
        .get('/api/saved')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('saved');
    });
  });

  describe('POST /api/saved', () => {
    it('bookmarks a scheme by slug', async () => {
      vi.mocked(SchemeModel.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: schemeId })
      } as any);

      const savedDoc = {
        _id: 'saved-1',
        userId,
        schemeId,
        status: 'saved',
        savedAt: new Date()
      };

      vi.mocked(SavedSchemeModel.findOneAndUpdate).mockReturnValue({
        populate: vi.fn().mockResolvedValue(savedDoc)
      } as any);

      const res = await request(app)
        .post('/api/saved')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ slug: 'karnataka-vidyasiri-scholarship', status: 'saved' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('saved');
    });
  });

  describe('PATCH /api/saved/:ref', () => {
    it('updates bookmark status to applied', async () => {
      vi.mocked(SchemeModel.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: schemeId })
      } as any);

      const updatedDoc = {
        _id: 'saved-1',
        userId,
        schemeId,
        status: 'applied',
        savedAt: new Date()
      };

      vi.mocked(SavedSchemeModel.findOneAndUpdate).mockReturnValue({
        populate: vi.fn().mockResolvedValue(updatedDoc)
      } as any);

      const res = await request(app)
        .patch('/api/saved/karnataka-vidyasiri-scholarship')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ status: 'applied' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('applied');
    });
  });

  describe('DELETE /api/saved/:ref', () => {
    it('removes bookmark for user', async () => {
      vi.mocked(SchemeModel.findOne).mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: schemeId })
      } as any);

      vi.mocked(SavedSchemeModel.deleteOne).mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);

      const res = await request(app)
        .delete('/api/saved/karnataka-vidyasiri-scholarship')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Removed from saved schemes');
    });
  });
});
