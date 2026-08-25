import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { UserModel } from '../../models/User.js';
import { SavedSchemeModel } from '../../models/SavedScheme.js';
import { EligibilityResultModel } from '../../models/EligibilityResult.js';
import { DocumentChecklistModel } from '../../models/DocumentChecklist.js';
import { ConversationModel } from '../../models/Conversation.js';
import { generateTokens } from '../../middlewares/auth.js';

vi.mock('../../models/CitizenProfile.js', () => ({
  CitizenProfileModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn()
  }
}));

vi.mock('../../models/User.js', () => ({
  UserModel: {
    findById: vi.fn(),
    deleteOne: vi.fn()
  }
}));

vi.mock('../../models/SavedScheme.js', () => ({
  SavedSchemeModel: {
    find: vi.fn(),
    deleteMany: vi.fn()
  }
}));

vi.mock('../../models/EligibilityResult.js', () => ({
  EligibilityResultModel: {
    find: vi.fn(),
    deleteMany: vi.fn()
  }
}));

vi.mock('../../models/DocumentChecklist.js', () => ({
  DocumentChecklistModel: {
    find: vi.fn(),
    deleteMany: vi.fn()
  }
}));

vi.mock('../../models/Conversation.js', () => ({
  ConversationModel: {
    find: vi.fn(),
    deleteMany: vi.fn()
  }
}));

describe('Profile Routes', () => {
  const app = createApp();
  const userId = '665f1a2b3c4d5e6f7a8b9098';
  const mockUser = {
    _id: userId,
    phone: '9876543210',
    email: 'citizen@example.com',
    preferredLanguage: 'en',
    refreshTokenVersion: 0,
    notificationsEnabled: true,
    save: vi.fn().mockResolvedValue(true)
  };

  const tokens = generateTokens(mockUser);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(UserModel.findById).mockResolvedValue(mockUser as any);
  });

  describe('GET /api/profile', () => {
    it('returns formatted citizen profile with currentState', async () => {
      const mockProfileDoc = {
        userId,
        fullName: 'Aarav Kumar',
        currentState: 'Karnataka',
        district: 'Bengaluru Urban',
        age: 24,
        occupationCategory: 'student',
        toObject: () => ({
          userId,
          fullName: 'Aarav Kumar',
          currentState: 'Karnataka',
          district: 'Bengaluru Urban',
          age: 24,
          occupationCategory: 'student'
        })
      };
      vi.mocked(CitizenProfileModel.findOne).mockResolvedValue(mockProfileDoc as any);

      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentState).toBe('Karnataka');
      expect(res.body.data.fullName).toBe('Aarav Kumar');
    });

    it('returns 404 if profile not created yet', async () => {
      vi.mocked(CitizenProfileModel.findOne).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/profile', () => {
    it('updates citizen profile with explicit currentState and optional fields', async () => {
      const updatedDoc = {
        userId,
        fullName: 'Aarav Kumar',
        currentState: 'Karnataka',
        district: 'Mysuru',
        incomeBand: 'below_1l',
        toObject: () => ({
          userId,
          fullName: 'Aarav Kumar',
          currentState: 'Karnataka',
          district: 'Mysuru',
          incomeBand: 'below_1l'
        })
      };
      vi.mocked(CitizenProfileModel.findOneAndUpdate).mockResolvedValue(updatedDoc as any);

      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          fullName: 'Aarav Kumar',
          currentState: 'Karnataka',
          district: 'Mysuru',
          incomeBand: 'below_1l'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentState).toBe('Karnataka');
      expect(CitizenProfileModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId },
        expect.objectContaining({
          userId,
          currentState: 'Karnataka',
          district: 'Mysuru',
          incomeBand: 'below_1l'
        }),
        { new: true, upsert: true }
      );
    });
  });

  describe('GET and PATCH /api/profile/settings', () => {
    it('returns user settings', async () => {
      const res = await request(app)
        .get('/api/profile/settings')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.preferredLanguage).toBe('en');
    });

    it('updates language and notifications', async () => {
      const res = await request(app)
        .patch('/api/profile/settings')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ preferredLanguage: 'kn', notificationsEnabled: false });

      expect(res.status).toBe(200);
      expect(mockUser.preferredLanguage).toBe('kn');
      expect(mockUser.notificationsEnabled).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('GET /api/profile/export (DPDP compliance)', () => {
    it('exports all user data in DPDP-compliant format', async () => {
      vi.mocked(CitizenProfileModel.findOne).mockResolvedValue({
        userId,
        currentState: 'Karnataka',
        toObject: () => ({ userId, currentState: 'Karnataka' })
      } as any);
      vi.mocked(SavedSchemeModel.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([{ schemeId: { name: 'Vidyasiri', slug: 'vidyasiri' } }])
      } as any);
      vi.mocked(EligibilityResultModel.find).mockResolvedValue([]);
      vi.mocked(DocumentChecklistModel.find).mockResolvedValue([]);
      vi.mocked(ConversationModel.find).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/profile/export')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.data).toHaveProperty('account');
      expect(res.body.data).toHaveProperty('profile');
      expect(res.body.data).toHaveProperty('savedSchemes');
    });
  });

  describe('DELETE /api/profile (DPDP right to erasure)', () => {
    it('deletes account and all associated profile, saved schemes, checklists, conversations', async () => {
      vi.mocked(CitizenProfileModel.deleteOne).mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);
      vi.mocked(SavedSchemeModel.deleteMany).mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);
      vi.mocked(EligibilityResultModel.deleteMany).mockResolvedValue({ acknowledged: true, deletedCount: 0 } as any);
      vi.mocked(DocumentChecklistModel.deleteMany).mockResolvedValue({ acknowledged: true, deletedCount: 0 } as any);
      vi.mocked(ConversationModel.deleteMany).mockResolvedValue({ acknowledged: true, deletedCount: 0 } as any);
      vi.mocked(UserModel.deleteOne).mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);

      const res = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(CitizenProfileModel.deleteOne).toHaveBeenCalledWith({ userId });
      expect(SavedSchemeModel.deleteMany).toHaveBeenCalledWith({ userId });
      expect(UserModel.deleteOne).toHaveBeenCalledWith({ _id: userId });
    });
  });
});
