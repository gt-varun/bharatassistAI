import { describe, it, expect } from 'vitest';
import { compareSchemesList } from './compareSchemes.js';
import type { Scheme } from '@bharatassist/shared-types';

describe('compareSchemes', () => {
  const schemeA: Scheme = {
    name: 'Karnataka Vidyasiri Scholarship',
    slug: 'karnataka-vidyasiri-scholarship',
    department: 'Department of Collegiate Education',
    level: 'state',
    state: 'Karnataka',
    shortDescription: 'Scholarship for students',
    fullDescription: 'Full description A',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Full tuition fee reimbursement',
    eligibilityRules: {
      state: ['Karnataka'],
      ageMin: 18,
      ageMax: 25,
      incomeMax: 250000
    },
    eligibilitySummaryPlain: 'Open to Karnataka undergraduate students from families earning under Rs 2.5 lakh.',
    applicationMode: 'online',
    officialPortalUrl: 'https://vidyasiri.karnataka.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: new Date('2026-10-31T00:00:00.000Z'),
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Ref A',
    extractionConfidence: 1.0,
    requiredDocuments: [
      { label: 'Income Certificate', howToObtain: 'Taluk office', mandatory: true },
      { label: 'College Bonafide', howToObtain: 'College', mandatory: true }
    ]
  };

  const schemeB: Scheme = {
    name: 'Post-Matric Scholarship for SC Students',
    slug: 'post-matric-scholarship-sc',
    department: 'Ministry of Social Justice and Empowerment',
    level: 'central',
    state: null,
    shortDescription: 'Scholarship for SC students',
    fullDescription: 'Full description B',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Maintenance allowance and tuition support',
    eligibilityRules: {
      incomeMax: 250000,
      categoryRestriction: ['SC']
    },
    eligibilitySummaryPlain: 'SC students with family income under Rs 2.5 lakh.',
    applicationMode: 'online',
    officialPortalUrl: 'https://scholarships.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Ref B',
    extractionConfidence: 1.0,
    requiredDocuments: [
      { label: 'Caste Certificate', howToObtain: 'e-District', mandatory: true },
      { label: 'Income Certificate', howToObtain: 'Taluk office', mandatory: true },
      { label: 'Fee Receipt', howToObtain: 'College', mandatory: false }
    ]
  };

  const schemeC: Scheme = {
    name: 'PM MUDRA Yojana',
    slug: 'pm-mudra-yojana',
    department: 'Department of Financial Services',
    level: 'central',
    state: null,
    shortDescription: 'Business loans for micro enterprises',
    fullDescription: 'Full description C',
    targetSegments: ['entrepreneur', 'msme'],
    benefitType: 'loan',
    benefitSummary: 'Collateral-free institutional credit up to Rs 10 lakh',
    eligibilityRules: {},
    eligibilitySummaryPlain: 'Non-corporate, non-farm small/micro enterprises.',
    applicationMode: 'both',
    officialPortalUrl: 'https://mudra.org.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Ref C',
    extractionConfidence: 1.0,
    requiredDocuments: [
      { label: 'Identity Proof', howToObtain: 'UIDAI', mandatory: true }
    ]
  };

  const schemeD: Scheme = {
    name: 'PM-KISAN Samman Nidhi',
    slug: 'pm-kisan-samman-nidhi',
    department: 'Ministry of Agriculture and Farmers Welfare',
    level: 'central',
    state: null,
    shortDescription: 'Income support for farmer families',
    fullDescription: 'Full description D',
    targetSegments: ['farmer'],
    benefitType: 'cash',
    benefitSummary: 'Direct benefit transfer of Rs 6,000 per year',
    eligibilityRules: {
      occupationCategory: ['farmer']
    },
    eligibilitySummaryPlain: 'All landholding farmer families.',
    applicationMode: 'online',
    officialPortalUrl: 'https://pmkisan.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Ref D',
    extractionConfidence: 1.0,
    requiredDocuments: [
      { label: 'Aadhaar Card', howToObtain: 'UIDAI', mandatory: true },
      { label: 'Land Ownership Records', howToObtain: 'Revenue Dept', mandatory: true }
    ]
  };

  describe('comparison counts (2 to 4 schemes)', () => {
    it('compares exactly 2 schemes side-by-side', () => {
      const result = compareSchemesList([schemeA, schemeB]);
      expect(result.schemes).toHaveLength(2);
      expect(result.schemes[0].schemeName).toBe('Karnataka Vidyasiri Scholarship');
      expect(result.schemes[1].schemeName).toBe('Post-Matric Scholarship for SC Students');
    });

    it('compares 3 schemes side-by-side', () => {
      const result = compareSchemesList([schemeA, schemeB, schemeC]);
      expect(result.schemes).toHaveLength(3);
    });

    it('compares 4 schemes side-by-side', () => {
      const result = compareSchemesList([schemeA, schemeB, schemeC, schemeD]);
      expect(result.schemes).toHaveLength(4);
    });
  });

  describe('data normalization and field mapping', () => {
    it('normalizes central schemes with null state to Central (All States)', () => {
      const result = compareSchemesList([schemeA, schemeB]);
      expect(result.schemes[0].state).toBe('Karnataka');
      expect(result.schemes[1].state).toBe('Central (All States)');
    });

    it('calculates required document count correctly', () => {
      const result = compareSchemesList([schemeA, schemeB]);
      expect(result.schemes[0].requiredDocumentsCount).toBe(2);
      expect(result.schemes[1].requiredDocumentsCount).toBe(3);
    });

    it('formats ISO deadline when present and Rolling / Open when deadline is null', () => {
      const result = compareSchemesList([schemeA, schemeB]);
      expect(result.schemes[0].applicationDeadline).toContain('2026-10-31');
      expect(result.schemes[1].applicationDeadline).toBe('Rolling / Open');
    });

    it('builds fallback deterministic summary from eligibilityRules if eligibilitySummaryPlain is missing', () => {
      const schemeWithoutPlainSummary: Scheme = {
        ...schemeA,
        eligibilitySummaryPlain: ''
      };
      const result = compareSchemesList([schemeWithoutPlainSummary, schemeB]);
      expect(result.schemes[0].eligibilitySummary).toContain('State: Karnataka');
      expect(result.schemes[0].eligibilitySummary).toContain('Age: 18–25 yrs');
      expect(result.schemes[0].eligibilitySummary).toContain('Income Max:');
    });
  });

  describe('difference detection and highlighting', () => {
    it('correctly flags fields that differ across schemes in differences and differingFields', () => {
      const result = compareSchemesList([schemeA, schemeB]);

      // Differences expected: level (state vs central), state (Karnataka vs Central), requiredDocumentsCount (2 vs 3), applicationDeadline (Date vs Rolling)
      expect(result.differences['level']).toBe(true);
      expect(result.differences['state']).toBe(true);
      expect(result.differences['requiredDocumentsCount']).toBe(true);
      expect(result.differences['applicationDeadline']).toBe(true);

      expect(result.differingFields).toContain('level');
      expect(result.differingFields).toContain('state');
      expect(result.differingFields).toContain('requiredDocumentsCount');
    });

    it('does not flag fields as differing when all schemes share the exact same value', () => {
      const result = compareSchemesList([schemeA, schemeB]);

      // Both schemeA and schemeB have benefitType === 'subsidy' and applicationMode === 'online'
      expect(result.differences['benefitType']).toBe(false);
      expect(result.differences['applicationMode']).toBe(false);

      expect(result.differingFields).not.toContain('benefitType');
      expect(result.differingFields).not.toContain('applicationMode');
    });
  });

  describe('edge cases and safety', () => {
    it('returns empty result when given empty array', () => {
      const result = compareSchemesList([]);
      expect(result.schemes).toEqual([]);
      expect(result.differingFields).toEqual([]);
      expect(result.differences).toEqual({});
    });
  });
});
