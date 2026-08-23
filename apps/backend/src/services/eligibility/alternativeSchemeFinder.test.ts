import { describe, it, expect } from 'vitest';
import { findAlternativeSchemes } from './alternativeSchemeFinder.js';
import type { Scheme } from '@bharatassist/shared-types';

describe('alternativeSchemeFinder', () => {
  const failedScheme: Scheme = {
    name: 'State Low-Income Student Scholarship',
    slug: 'state-low-income-student-scholarship',
    department: 'Department of Higher Education',
    level: 'state',
    state: 'Karnataka',
    shortDescription: 'Scholarship for low-income students in Karnataka',
    fullDescription: 'Full description',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Full tuition reimbursement',
    eligibilityRules: {
      state: ['Karnataka'],
      ageMin: 18,
      ageMax: 25,
      incomeMax: 150000,
      occupationCategory: ['student']
    },
    eligibilitySummaryPlain: 'Karnataka students with income under 1.5L',
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

  const higherIncomeStudentScheme: Scheme = {
    name: 'National Higher Income Student Scholarship',
    slug: 'national-higher-income-student-scholarship',
    department: 'Ministry of Education',
    level: 'central',
    state: null,
    shortDescription: 'National scholarship with higher income ceiling',
    fullDescription: 'Full description',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Tuition support',
    eligibilityRules: {
      incomeMax: 500000,
      occupationCategory: ['student']
    },
    eligibilitySummaryPlain: 'Open to students with family income up to 5L',
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

  const centralStudentNoIncomeCapScheme: Scheme = {
    name: 'Merit-Based National Student Scheme',
    slug: 'merit-based-national-student-scheme',
    department: 'Ministry of Education',
    level: 'central',
    state: null,
    shortDescription: 'Merit scholarship with no income limit',
    fullDescription: 'Full description',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Merit award',
    eligibilityRules: {
      occupationCategory: ['student']
    },
    eligibilitySummaryPlain: 'Open to all students with no income cap',
    applicationMode: 'online',
    officialPortalUrl: 'https://scholarships.gov.in',
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

  const closedStudentScheme: Scheme = {
    name: 'Expired Student Scheme',
    slug: 'expired-student-scheme',
    department: 'Dept of Education',
    level: 'central',
    state: null,
    shortDescription: 'Closed scheme',
    fullDescription: 'Full description',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Closed',
    eligibilityRules: {
      occupationCategory: ['student']
    },
    eligibilitySummaryPlain: 'Closed',
    applicationMode: 'online',
    officialPortalUrl: 'https://scholarships.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'closed',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Order 4',
    extractionConfidence: 1.0,
    requiredDocuments: []
  };

  const farmerPensionScheme: Scheme = {
    name: 'PM Farmer Pension',
    slug: 'pm-farmer-pension',
    department: 'Ministry of Agriculture',
    level: 'central',
    state: null,
    shortDescription: 'Pension for farmers',
    fullDescription: 'Full description',
    targetSegments: ['farmer'],
    benefitType: 'cash',
    benefitSummary: 'Monthly pension',
    eligibilityRules: {
      occupationCategory: ['farmer']
    },
    eligibilitySummaryPlain: 'Farmers only',
    applicationMode: 'online',
    officialPortalUrl: 'https://agri.gov.in',
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

  describe('income failure alternative recommendations', () => {
    it('recommends schemes with higher or no income ceiling when income is too high', async () => {
      const profile = {
        state: 'Karnataka',
        age: 20,
        income: 300000, // Exceeds 150000 limit of failedScheme
        occupationCategory: 'student'
      };

      const candidatePool = [
        failedScheme,
        higherIncomeStudentScheme,
        centralStudentNoIncomeCapScheme,
        closedStudentScheme,
        farmerPensionScheme
      ];

      const alternatives = await findAlternativeSchemes(
        failedScheme,
        profile,
        undefined,
        candidatePool
      );

      expect(alternatives.length).toBeGreaterThan(0);
      const recommendedSlugs = alternatives.map((a) => a.schemeId);

      // Should recommend higher income and no-income cap student schemes
      expect(recommendedSlugs).toContain(higherIncomeStudentScheme.slug);
      expect(recommendedSlugs).toContain(centralStudentNoIncomeCapScheme.slug);

      // Must never recommend the failed scheme itself
      expect(recommendedSlugs).not.toContain(failedScheme.slug);

      // Must never recommend closed schemes
      expect(recommendedSlugs).not.toContain(closedStudentScheme.slug);

      // Must never recommend schemes from unrelated segments (farmer pension for a student applicant)
      expect(recommendedSlugs).not.toContain(farmerPensionScheme.slug);
    });

    it('provides tailored reason message referencing higher income support', async () => {
      const profile = {
        state: 'Karnataka',
        age: 20,
        income: 300000,
        occupationCategory: 'student'
      };

      const alternatives = await findAlternativeSchemes(
        failedScheme,
        profile,
        undefined,
        [higherIncomeStudentScheme]
      );

      expect(alternatives[0].reasonRecommended).toContain('Supports higher annual household income limits');
    });
  });

  describe('state failure alternative recommendations', () => {
    it('recommends central schemes when state restriction fails', async () => {
      const profile = {
        state: 'Bihar', // Does not match Karnataka state
        age: 20,
        income: 100000,
        occupationCategory: 'student'
      };

      const alternatives = await findAlternativeSchemes(
        failedScheme,
        profile,
        undefined,
        [centralStudentNoIncomeCapScheme]
      );

      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].schemeId).toBe(centralStudentNoIncomeCapScheme.slug);
      expect(alternatives[0].reasonRecommended).toContain('Central government scheme available nationwide');
    });
  });

  describe('deterministic ranking and stability', () => {
    it('returns an identical ranking and recommendation output across repeated calls', async () => {
      const profile = {
        state: 'Karnataka',
        age: 20,
        income: 300000,
        occupationCategory: 'student'
      };

      const candidatePool = [
        higherIncomeStudentScheme,
        centralStudentNoIncomeCapScheme
      ];

      const run1 = await findAlternativeSchemes(failedScheme, profile, undefined, candidatePool);
      const run2 = await findAlternativeSchemes(failedScheme, profile, undefined, candidatePool);

      expect(run1).toEqual(run2);
    });

    it('caps recommendations to top 5', async () => {
      const manySchemes: Scheme[] = Array.from({ length: 10 }, (_, i) => ({
        ...centralStudentNoIncomeCapScheme,
        name: `Student Scheme ${i}`,
        slug: `student-scheme-${i}`
      }));

      const alternatives = await findAlternativeSchemes(
        failedScheme,
        { state: 'Karnataka', age: 20, occupationCategory: 'student' },
        undefined,
        manySchemes
      );

      expect(alternatives.length).toBeLessThanOrEqual(5);
    });
  });

  describe('edge cases and safety', () => {
    it('returns empty array when candidate pool contains only closed schemes', async () => {
      const alternatives = await findAlternativeSchemes(
        failedScheme,
        { income: 300000 },
        undefined,
        [closedStudentScheme]
      );
      expect(alternatives).toEqual([]);
    });

    it('handles empty profile gracefully without crashing', async () => {
      const alternatives = await findAlternativeSchemes(
        failedScheme,
        {},
        undefined,
        [centralStudentNoIncomeCapScheme]
      );
      expect(Array.isArray(alternatives)).toBe(true);
    });
  });
});
