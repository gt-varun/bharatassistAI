import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import type { Scheme } from '@bharatassist/shared-types';

const { mockScheme } = vi.hoisted(() => {
  const scheme: Scheme = {
    _id: '665f1a2b3c4d5e6f7a8b9001' as any,
    name: 'Karnataka Vidyasiri Scholarship',
    slug: 'karnataka-vidyasiri-scholarship',
    department: 'Department of Collegiate Education',
    level: 'state',
    state: 'Karnataka',
    shortDescription: 'Scholarship for students in Karnataka',
    fullDescription: 'Full details...',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Full tuition fee reimbursement',
    eligibilityRules: {},
    eligibilitySummaryPlain: 'Karnataka undergraduate students',
    applicationMode: 'online',
    officialPortalUrl: 'https://karnataka.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Order 1',
    extractionConfidence: 1.0,
    requiredDocuments: [
      { label: 'Aadhaar Card', howToObtain: 'UIDAI', mandatory: true },
      { label: 'Income Certificate', howToObtain: 'Taluk Office', mandatory: true },
      { label: 'Caste Certificate', howToObtain: 'Nadakacheri', mandatory: true },
      { label: 'Disability Certificate', howToObtain: 'UDID Portal', mandatory: true }
    ]
  };
  return { mockScheme: scheme };
});

// Mock retrieval service
vi.mock('../../services/ai/retrievalService.js', () => ({
  getSchemeBySlugOrId: vi.fn().mockImplementation(async (idOrSlug: string) => {
    if (idOrSlug === 'karnataka-vidyasiri-scholarship' || idOrSlug === '665f1a2b3c4d5e6f7a8b9001') {
      return mockScheme;
    }
    return null;
  })
}));

// Mock Models
vi.mock('../../models/User.js', () => ({
  UserModel: {
    findById: vi.fn()
  }
}));

vi.mock('../../models/CitizenProfile.js', () => ({
  CitizenProfileModel: {
    findOne: vi.fn()
  }
}));

vi.mock('../../models/EligibilityResult.js', () => ({
  EligibilityResultModel: {
    findOne: vi.fn()
  }
}));

vi.mock('../../models/DocumentChecklist.js', () => ({
  DocumentChecklistModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn().mockResolvedValue({ _id: 'mock_checklist_id' })
  }
}));

import { UserModel } from '../../models/User.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { EligibilityResultModel } from '../../models/EligibilityResult.js';
import { DocumentChecklistModel } from '../../models/DocumentChecklist.js';

describe('Checklist API Integration Tests', () => {
  const app = createApp();
  const testUserId = '665f1a2b3c4d5e6f7a8b9099';
  const validToken = jwt.sign(
    { userId: testUserId },
    process.env.JWT_SECRET || 'dev_jwt_access_secret_key_32_chars_minimum',
    { expiresIn: '15m' }
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/checklist/:schemeId', () => {
    it('returns document checklist for valid scheme in guest mode', async () => {
      const response = await request(app).get(
        '/api/checklist/karnataka-vidyasiri-scholarship'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schemeName).toBe('Karnataka Vidyasiri Scholarship');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items).toHaveLength(4);
    });

    it('filters documents based on profile and preserves existing checklist progress when authenticated', async () => {
      (UserModel.findById as any).mockResolvedValue({
        _id: testUserId,
        phone: '9876543210',
        email: 'user@example.com',
        preferredLanguage: 'en'
      });

      (CitizenProfileModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          userId: testUserId,
          category: 'General',
          disabilityStatus: false
        })
      });

      (EligibilityResultModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      });

      (DocumentChecklistModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          userId: testUserId,
          schemeId: mockScheme._id,
          items: [{ label: 'Aadhaar Card', status: 'have', howToObtain: 'UIDAI' }]
        })
      });

      const response = await request(app)
        .get('/api/checklist/karnataka-vidyasiri-scholarship')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const items = response.body.data.items;

      // Aadhaar status should be preserved as 'have' from existing checklist
      expect(items.find((i: any) => i.label === 'Aadhaar Card')?.status).toBe('have');

      // General category profile marks Caste Certificate as not_required
      expect(items.find((i: any) => i.label === 'Caste Certificate')?.status).toBe('not_required');

      // Non-disabled profile marks Disability Certificate as not_applicable
      expect(items.find((i: any) => i.label === 'Disability Certificate')?.status).toBe('not_applicable');

      // Check that persistence was triggered for authenticated user
      expect(DocumentChecklistModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('returns 404 SCHEME_NOT_FOUND when scheme does not exist', async () => {
      const response = await request(app).get('/api/checklist/unknown-scheme-slug');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHEME_NOT_FOUND');
    });
  });

  describe('PATCH /api/checklist/:schemeId', () => {
    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const response = await request(app)
        .patch('/api/checklist/karnataka-vidyasiri-scholarship')
        .send({ items: [{ label: 'Aadhaar Card', status: 'have' }] });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('updates item status for authenticated user and persists to database', async () => {
      (UserModel.findById as any).mockResolvedValue({
        _id: testUserId,
        phone: '9876543210',
        email: 'user@example.com',
        preferredLanguage: 'en'
      });

      (DocumentChecklistModel.findOne as any).mockResolvedValue({
        userId: testUserId,
        schemeId: mockScheme._id,
        items: [
          { label: 'Aadhaar Card', status: 'required', howToObtain: 'UIDAI' },
          { label: 'Income Certificate', status: 'required', howToObtain: 'Taluk Office' }
        ]
      });

      const response = await request(app)
        .patch('/api/checklist/karnataka-vidyasiri-scholarship')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ items: [{ label: 'Aadhaar Card', status: 'have' }] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(DocumentChecklistModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(response.body.data.items.find((i: any) => i.label === 'Aadhaar Card')?.status).toBe('have');
      expect(response.body.data.items.find((i: any) => i.label === 'Income Certificate')?.status).toBe('required');
    });

    it('rejects invalid status enum with 400 BAD_REQUEST', async () => {
      (UserModel.findById as any).mockResolvedValue({
        _id: testUserId,
        phone: '9876543210',
        email: 'user@example.com',
        preferredLanguage: 'en'
      });

      const response = await request(app)
        .patch('/api/checklist/karnataka-vidyasiri-scholarship')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ items: [{ label: 'Aadhaar Card', status: 'invalid_status_value' }] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects empty items array with 400 BAD_REQUEST', async () => {
      (UserModel.findById as any).mockResolvedValue({
        _id: testUserId,
        phone: '9876543210',
        email: 'user@example.com',
        preferredLanguage: 'en'
      });

      const response = await request(app)
        .patch('/api/checklist/karnataka-vidyasiri-scholarship')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });
  });
});
