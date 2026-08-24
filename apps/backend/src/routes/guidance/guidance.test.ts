import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import type { Scheme } from '@bharatassist/shared-types';

const { mockScheme, mockSchemeWithInvalidUrl } = vi.hoisted(() => {
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
    officialPortalUrl: 'https://karnataka.gov.in/vidyasiri',
    applicationFields: [
      { fieldName: 'Applicant State', instructions: 'State of permanent domicile', mandatory: true },
      { fieldName: 'Applicant Age', instructions: 'Age as per SSLC', mandatory: true }
    ],
    commonMistakes: [
      'Name spelling mismatch with Aadhaar card',
      'Uploading expired certificate from Taluk office'
    ],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Order 1',
    extractionConfidence: 1.0,
    requiredDocuments: [
      { label: 'Bonafide Certificate', howToObtain: 'From college', mandatory: true }
    ]
  };

  const schemeInvalid: Scheme = {
    ...scheme,
    _id: '665f1a2b3c4d5e6f7a8b9002' as any,
    slug: 'scheme-unverified-portal',
    officialPortalUrl: 'invalid_url_string'
  };

  return { mockScheme: scheme, mockSchemeWithInvalidUrl: schemeInvalid };
});

// Mock retrieval service
vi.mock('../../services/ai/retrievalService.js', () => ({
  getSchemeBySlugOrId: vi.fn().mockImplementation(async (idOrSlug: string) => {
    if (idOrSlug === 'karnataka-vidyasiri-scholarship' || idOrSlug === '665f1a2b3c4d5e6f7a8b9001') {
      return mockScheme;
    }
    if (idOrSlug === 'scheme-unverified-portal' || idOrSlug === '665f1a2b3c4d5e6f7a8b9002') {
      return mockSchemeWithInvalidUrl;
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

import { UserModel } from '../../models/User.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';

describe('Guidance API Integration Tests', () => {
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

  describe('GET /api/guidance/:schemeId', () => {
    it('returns application guidance for a valid scheme in guest mode', async () => {
      const response = await request(app).get(
        '/api/guidance/karnataka-vidyasiri-scholarship'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schemeName).toBe('Karnataka Vidyasiri Scholarship');
      expect(Array.isArray(response.body.data.fieldByFieldGuidance)).toBe(true);
      expect(response.body.data.fieldByFieldGuidance).toHaveLength(2);
      expect(Array.isArray(response.body.data.commonMistakes)).toBe(true);
      expect(Array.isArray(response.body.data.glossary)).toBe(true);
      expect(response.body.data.officialPortalUrl).toBe('https://karnataka.gov.in/vidyasiri');
      expect(response.body.data.portalValid).toBe(true);
      expect(response.body.data.readyToApply).toBe(true);
    });

    it('pre-fills guidance fields when authenticated with a citizen profile', async () => {
      (UserModel.findById as any).mockResolvedValue({
        _id: testUserId,
        phone: '9876543210',
        email: 'user@example.com',
        preferredLanguage: 'en'
      });

      (CitizenProfileModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          userId: testUserId,
          state: 'Karnataka',
          age: 20
        })
      });

      const response = await request(app)
        .get('/api/guidance/karnataka-vidyasiri-scholarship')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const fields = response.body.data.fieldByFieldGuidance;

      expect(fields.find((f: any) => f.fieldName === 'Applicant State')?.prefilledValue).toBe('Karnataka');
      expect(fields.find((f: any) => f.fieldName === 'Applicant Age')?.prefilledValue).toBe(20);
    });

    it('handles unverified portal URLs and marks readyToApply as false with notes', async () => {
      const response = await request(app).get(
        '/api/guidance/scheme-unverified-portal'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.portalValid).toBe(false);
      expect(response.body.data.readyToApply).toBe(false);
      expect(response.body.data.notes).toBeDefined();
    });

    it('returns 404 SCHEME_NOT_FOUND for non-existent scheme', async () => {
      const response = await request(app).get(
        '/api/guidance/non-existent-slug'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHEME_NOT_FOUND');
    });
  });
});
