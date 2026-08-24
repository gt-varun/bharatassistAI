import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import type { Scheme } from '@bharatassist/shared-types';

const { scheme1, scheme2, scheme3, scheme4, scheme5 } = vi.hoisted(() => {
  const s1: Scheme = {
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
    eligibilityRules: { state: ['Karnataka'], incomeMax: 250000 },
    eligibilitySummaryPlain: 'Karnataka undergraduate students',
    applicationMode: 'online',
    officialPortalUrl: 'https://vidyasiri.karnataka.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: new Date('2026-10-31T00:00:00.000Z'),
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Order 1',
    extractionConfidence: 1.0,
    requiredDocuments: [
      { label: 'Income Certificate', howToObtain: 'Taluk Office', mandatory: true },
      { label: 'Bonafide', howToObtain: 'College', mandatory: true }
    ]
  };

  const s2: Scheme = {
    name: 'Post-Matric Scholarship for SC Students',
    slug: 'post-matric-scholarship-sc',
    department: 'Ministry of Social Justice',
    level: 'central',
    state: null,
    shortDescription: 'Scholarship for SC students',
    fullDescription: 'Full details...',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Maintenance allowance',
    eligibilityRules: { categoryRestriction: ['SC'], incomeMax: 250000 },
    eligibilitySummaryPlain: 'SC students nationwide',
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
    requiredDocuments: [
      { label: 'Caste Certificate', howToObtain: 'e-District', mandatory: true }
    ]
  };

  const s3: Scheme = {
    name: 'PM MUDRA Yojana',
    slug: 'pm-mudra-yojana',
    department: 'Department of Financial Services',
    level: 'central',
    state: null,
    shortDescription: 'Business loans',
    fullDescription: 'Full details...',
    targetSegments: ['msme'],
    benefitType: 'loan',
    benefitSummary: 'Loans up to 10L',
    eligibilityRules: {},
    eligibilitySummaryPlain: 'Small business owners',
    applicationMode: 'both',
    officialPortalUrl: 'https://mudra.org.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Order 3',
    extractionConfidence: 1.0,
    requiredDocuments: []
  };

  const s4: Scheme = {
    name: 'PM-KISAN Samman Nidhi',
    slug: 'pm-kisan-samman-nidhi',
    department: 'Ministry of Agriculture',
    level: 'central',
    state: null,
    shortDescription: 'Income support for farmers',
    fullDescription: 'Full details...',
    targetSegments: ['farmer'],
    benefitType: 'cash',
    benefitSummary: '6000 / year',
    eligibilityRules: {},
    eligibilitySummaryPlain: 'Farmer families',
    applicationMode: 'online',
    officialPortalUrl: 'https://pmkisan.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Order 4',
    extractionConfidence: 1.0,
    requiredDocuments: []
  };

  const s5: Scheme = {
    name: 'Fifth Scheme',
    slug: 'fifth-scheme',
    department: 'Dept 5',
    level: 'central',
    state: null,
    shortDescription: 'Scheme 5',
    fullDescription: 'Details 5',
    targetSegments: ['all'],
    benefitType: 'cash',
    benefitSummary: 'Benefit 5',
    eligibilityRules: {},
    eligibilitySummaryPlain: 'Summary 5',
    applicationMode: 'online',
    officialPortalUrl: 'https://india.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Order 5',
    extractionConfidence: 1.0,
    requiredDocuments: []
  };

  return { scheme1: s1, scheme2: s2, scheme3: s3, scheme4: s4, scheme5: s5 };
});

// Mock retrieval service
vi.mock('../../services/ai/retrievalService.js', () => ({
  getSchemeBySlugOrId: vi.fn().mockImplementation(async (idOrSlug: string) => {
    switch (idOrSlug) {
      case 'karnataka-vidyasiri-scholarship':
        return scheme1;
      case 'post-matric-scholarship-sc':
        return scheme2;
      case 'pm-mudra-yojana':
        return scheme3;
      case 'pm-kisan-samman-nidhi':
        return scheme4;
      case 'fifth-scheme':
        return scheme5;
      default:
        return null;
    }
  })
}));

describe('Compare API Integration Tests', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/compare', () => {
    it('compares 2 valid schemes in public access mode without requiring authentication', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({
          schemeIds: ['karnataka-vidyasiri-scholarship', 'post-matric-scholarship-sc']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schemes).toHaveLength(2);
      expect(response.body.data.differences).toBeDefined();
      expect(Array.isArray(response.body.data.differingFields)).toBe(true);
    });

    it('compares 3 valid schemes successfully', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({
          schemeIds: [
            'karnataka-vidyasiri-scholarship',
            'post-matric-scholarship-sc',
            'pm-mudra-yojana'
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schemes).toHaveLength(3);
    });

    it('compares 4 valid schemes successfully', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({
          schemeIds: [
            'karnataka-vidyasiri-scholarship',
            'post-matric-scholarship-sc',
            'pm-mudra-yojana',
            'pm-kisan-samman-nidhi'
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schemes).toHaveLength(4);
    });

    it('rejects comparison with fewer than 2 schemes (400 BAD_REQUEST)', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({ schemeIds: ['karnataka-vidyasiri-scholarship'] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects comparison with more than 4 schemes (400 BAD_REQUEST)', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({
          schemeIds: [
            'karnataka-vidyasiri-scholarship',
            'post-matric-scholarship-sc',
            'pm-mudra-yojana',
            'pm-kisan-samman-nidhi',
            'fifth-scheme'
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects duplicate schemes in comparison request (400 BAD_REQUEST)', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({
          schemeIds: [
            'karnataka-vidyasiri-scholarship',
            'karnataka-vidyasiri-scholarship'
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects invalid non-array payload (400 BAD_REQUEST)', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({ schemeIds: 'karnataka-vidyasiri-scholarship' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 404 SCHEME_NOT_FOUND when one of the schemes is unknown', async () => {
      const response = await request(app)
        .post('/api/compare')
        .send({
          schemeIds: [
            'karnataka-vidyasiri-scholarship',
            'unknown-nonexistent-scheme'
          ]
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHEME_NOT_FOUND');
    });
  });
});
