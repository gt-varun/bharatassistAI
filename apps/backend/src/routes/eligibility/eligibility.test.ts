import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import type { Scheme } from '@bharatassist/shared-types';

const { mockScheme, mockAlternativeScheme } = vi.hoisted(() => {
  const schemeA: Scheme = {
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
    eligibilityRules: {
      state: ['Karnataka'],
      ageMin: 18,
      ageMax: 25,
      incomeMax: 250000,
      occupationCategory: ['student']
    },
    eligibilitySummaryPlain: 'Karnataka undergraduate students earning under Rs 2.5L',
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
    requiredDocuments: []
  };

  const schemeB: Scheme = {
    _id: '665f1a2b3c4d5e6f7a8b9002' as any,
    name: 'National Merit Scholarship',
    slug: 'national-merit-scholarship',
    department: 'Ministry of Education',
    level: 'central',
    state: null,
    shortDescription: 'National scholarship with higher income ceiling',
    fullDescription: 'Full details',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Tuition support',
    eligibilityRules: {
      incomeMax: 500000,
      occupationCategory: ['student']
    },
    eligibilitySummaryPlain: 'Open to all students nationwide with income up to 5L',
    applicationMode: 'online',
    officialPortalUrl: 'https://scholarships.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Order 2',
    extractionConfidence: 1.0,
    requiredDocuments: []
  };

  return { mockScheme: schemeA, mockAlternativeScheme: schemeB };
});

// Mock retrieval service
vi.mock('../../services/ai/retrievalService.js', () => ({
  getSchemeBySlugOrId: vi.fn().mockImplementation(async (idOrSlug: string) => {
    if (idOrSlug === 'karnataka-vidyasiri-scholarship' || idOrSlug === '665f1a2b3c4d5e6f7a8b9001') {
      return mockScheme;
    }
    if (idOrSlug === 'national-merit-scholarship' || idOrSlug === '665f1a2b3c4d5e6f7a8b9002') {
      return mockAlternativeScheme;
    }
    return null;
  }),
  searchSchemes: vi.fn().mockResolvedValue({
    schemes: [mockAlternativeScheme],
    pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
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
    findOneAndUpdate: vi.fn().mockResolvedValue({ _id: 'mock_elig_res_id' })
  }
}));

import { UserModel } from '../../models/User.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { EligibilityResultModel } from '../../models/EligibilityResult.js';

describe('Eligibility API Integration Tests', () => {
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

  describe('GET /api/eligibility/:schemeId/questions', () => {
    it('returns generated eligibility questions for a valid scheme in guest mode', async () => {
      const response = await request(app).get(
        '/api/eligibility/karnataka-vidyasiri-scholarship/questions'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.schemeName).toBe('Karnataka Vidyasiri Scholarship');
      expect(Array.isArray(response.body.data.questions)).toBe(true);
      expect(response.body.data.questions.length).toBeGreaterThan(0);

      // Verify question fields derived from eligibilityRules
      const questionFields = response.body.data.questions.map((q: any) => q.field);
      expect(questionFields).toContain('state');
      expect(questionFields).toContain('age');
      expect(questionFields).toContain('income');
      expect(questionFields).toContain('occupationCategory');

      // Guest questions should not be prefilled
      expect(response.body.data.questions.every((q: any) => q.prefilled === false)).toBe(true);
    });

    it('pre-fills questions when authenticated with a populated citizen profile', async () => {
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
          age: 21,
          income: 180000,
          occupationCategory: 'student'
        })
      });

      const response = await request(app)
        .get('/api/eligibility/karnataka-vidyasiri-scholarship/questions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const questions = response.body.data.questions;

      const stateQ = questions.find((q: any) => q.field === 'state');
      expect(stateQ?.prefilled).toBe(true);
      expect(stateQ?.currentValue).toBe('Karnataka');

      const ageQ = questions.find((q: any) => q.field === 'age');
      expect(ageQ?.prefilled).toBe(true);
      expect(ageQ?.currentValue).toBe(21);
    });

    it('returns 404 SCHEME_NOT_FOUND when scheme does not exist', async () => {
      const response = await request(app).get(
        '/api/eligibility/non-existent-scheme/questions'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHEME_NOT_FOUND');
    });
  });

  describe('POST /api/eligibility/:schemeId/evaluate', () => {
    it('evaluates fully eligible applicant and returns eligible status', async () => {
      const answers = {
        state: 'Karnataka',
        age: 20,
        income: 150000,
        occupationCategory: 'student'
      };

      const response = await request(app)
        .post('/api/eligibility/karnataka-vidyasiri-scholarship/evaluate')
        .send({ answers });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('eligible');
      expect(Array.isArray(response.body.data.reasons)).toBe(true);
      expect(response.body.data.missingRequirements).toHaveLength(0);
      expect(response.body.data.alternativeSchemes).toHaveLength(0);
    });

    it('evaluates ineligible applicant, returns not_eligible and alternative schemes', async () => {
      const answers = {
        state: 'Karnataka',
        age: 20,
        income: 400000, // Exceeds 250000 ceiling
        occupationCategory: 'student'
      };

      const response = await request(app)
        .post('/api/eligibility/karnataka-vidyasiri-scholarship/evaluate')
        .send({ answers });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('not_eligible');
      expect(response.body.data.missingRequirements.length).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data.alternativeSchemes)).toBe(true);
    });

    it('persists evaluation result to database when authenticated', async () => {
      (UserModel.findById as any).mockResolvedValue({
        _id: testUserId,
        phone: '9876543210',
        email: 'user@example.com',
        preferredLanguage: 'en'
      });

      (CitizenProfileModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          userId: testUserId,
          state: 'Karnataka'
        })
      });

      const answers = {
        state: 'Karnataka',
        age: 20,
        income: 150000,
        occupationCategory: 'student'
      };

      const response = await request(app)
        .post('/api/eligibility/karnataka-vidyasiri-scholarship/evaluate')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ answers });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(EligibilityResultModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(EligibilityResultModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ userId: testUserId, schemeId: mockScheme._id }),
        expect.objectContaining({ status: 'eligible' }),
        expect.any(Object)
      );
    });

    it('returns 400 BAD_REQUEST when answers payload is non-object type', async () => {
      const response = await request(app)
        .post('/api/eligibility/karnataka-vidyasiri-scholarship/evaluate')
        .send({ answers: 'invalid-string-answers' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 400 BAD_REQUEST when answers payload is an array', async () => {
      const response = await request(app)
        .post('/api/eligibility/karnataka-vidyasiri-scholarship/evaluate')
        .send({ answers: ['array', 'of', 'items'] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 404 SCHEME_NOT_FOUND when evaluating non-existent scheme', async () => {
      const response = await request(app)
        .post('/api/eligibility/unknown-scheme-slug/evaluate')
        .send({ answers: { age: 20 } });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHEME_NOT_FOUND');
    });
  });
});
