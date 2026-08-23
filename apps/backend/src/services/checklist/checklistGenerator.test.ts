import { describe, it, expect } from 'vitest';
import { generatePersonalizedChecklist } from './checklistGenerator.js';
import type { Scheme } from '@bharatassist/shared-types';

describe('checklistGenerator', () => {
  const sampleScheme: Scheme = {
    name: 'Karnataka Vidyasiri Scholarship',
    slug: 'karnataka-vidyasiri-scholarship',
    department: 'Department of Collegiate Education',
    level: 'state',
    state: 'Karnataka',
    shortDescription: 'Scholarship scheme for students',
    fullDescription: 'Full details...',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Tuition reimbursement',
    eligibilityRules: {},
    eligibilitySummaryPlain: 'Plain summary',
    applicationMode: 'online',
    officialPortalUrl: 'https://karnataka.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Gov Order 123',
    extractionConfidence: 1.0,
    requiredDocuments: [
      {
        label: 'Aadhaar Card',
        howToObtain: 'Download from UIDAI portal',
        mandatory: true
      },
      {
        label: 'Income Certificate',
        howToObtain: 'Apply at Taluk office or e-portal',
        mandatory: true
      },
      {
        label: 'Caste Certificate',
        howToObtain: 'Apply at Nadakacheri',
        mandatory: true
      },
      {
        label: 'Disability Certificate (UDID)',
        howToObtain: 'Apply via swavlambancard portal',
        mandatory: true
      },
      {
        label: 'Ration Card',
        howToObtain: 'State food supplies department',
        mandatory: false
      }
    ]
  };

  describe('base document classification', () => {
    it('marks mandatory documents as required by default', () => {
      const result = generatePersonalizedChecklist(sampleScheme, null, null);
      const aadhaar = result.find((d) => d.label === 'Aadhaar Card');
      expect(aadhaar).toBeDefined();
      expect(aadhaar?.status).toBe('required');
      expect(aadhaar?.mandatory).toBe(true);
    });

    it('marks non-mandatory documents as pending by default', () => {
      const result = generatePersonalizedChecklist(sampleScheme, null, null);
      const ration = result.find((d) => d.label === 'Ration Card');
      expect(ration).toBeDefined();
      expect(ration?.status).toBe('pending');
      expect(ration?.mandatory).toBe(false);
    });

    it('preserves howToObtain instructions from the scheme record', () => {
      const result = generatePersonalizedChecklist(sampleScheme);
      const income = result.find((d) => d.label === 'Income Certificate');
      expect(income?.howToObtain).toBe('Apply at Taluk office or e-portal');
    });

    it('falls back to default instructions if howToObtain is blank', () => {
      const schemeWithEmptyHowTo: Scheme = {
        ...sampleScheme,
        requiredDocuments: [{ label: 'Passport Photo', howToObtain: '', mandatory: true }]
      };
      const result = generatePersonalizedChecklist(schemeWithEmptyHowTo);
      expect(result[0].howToObtain).toBe('Refer to official scheme guidelines or local authority office.');
    });
  });

  describe('profile-aware document filtering', () => {
    it('marks disability certificates as not_applicable for non-disabled citizens', () => {
      const profile = { disabilityStatus: false };
      const result = generatePersonalizedChecklist(sampleScheme, profile);
      const disabilityDoc = result.find((d) => d.label.toLowerCase().includes('disability'));
      expect(disabilityDoc?.status).toBe('not_applicable');
    });

    it('keeps disability certificates required when applicant has a disability or status is unknown', () => {
      const withDisability = generatePersonalizedChecklist(sampleScheme, { disabilityStatus: true });
      expect(withDisability.find((d) => d.label.includes('Disability'))?.status).toBe('required');

      const unknownDisability = generatePersonalizedChecklist(sampleScheme, {});
      expect(unknownDisability.find((d) => d.label.includes('Disability'))?.status).toBe('required');
    });

    it('marks caste certificates as not_required for General category citizens', () => {
      const profile = { category: 'General' };
      const result = generatePersonalizedChecklist(sampleScheme, profile);
      const casteDoc = result.find((d) => d.label.toLowerCase().includes('caste'));
      expect(casteDoc?.status).toBe('not_required');
    });

    it('keeps caste certificates required for reserved category applicants (OBC, SC, ST)', () => {
      const obcResult = generatePersonalizedChecklist(sampleScheme, { category: 'OBC' });
      expect(obcResult.find((d) => d.label.includes('Caste'))?.status).toBe('required');

      const scResult = generatePersonalizedChecklist(sampleScheme, { category: 'SC' });
      expect(scResult.find((d) => d.label.includes('Caste'))?.status).toBe('required');
    });
  });

  describe('eligibility results integration', () => {
    it('marks documents as missing if explicitly flagged in eligibility missingRequirements', () => {
      const eligibilityResult = {
        missingRequirements: [
          'Income Certificate required (annual household income exceeds limit)',
          'Recent Bonafide letter'
        ]
      };
      const result = generatePersonalizedChecklist(sampleScheme, null, eligibilityResult);
      const incomeDoc = result.find((d) => d.label === 'Income Certificate');
      expect(incomeDoc?.status).toBe('missing');
    });

    it('evaluates multiple documents independently across rules', () => {
      const profile = { category: 'General', disabilityStatus: false };
      const eligibilityResult = { missingRequirements: ['income certificate required'] };

      const result = generatePersonalizedChecklist(sampleScheme, profile, eligibilityResult);

      expect(result.find((d) => d.label === 'Aadhaar Card')?.status).toBe('required');
      expect(result.find((d) => d.label === 'Income Certificate')?.status).toBe('missing');
      expect(result.find((d) => d.label === 'Caste Certificate')?.status).toBe('not_required');
      expect(result.find((d) => d.label.includes('Disability'))?.status).toBe('not_applicable');
      expect(result.find((d) => d.label === 'Ration Card')?.status).toBe('pending');
    });
  });

  describe('edge cases and safety', () => {
    it('returns empty array if scheme is null or undefined', () => {
      expect(generatePersonalizedChecklist(null)).toEqual([]);
      expect(generatePersonalizedChecklist(undefined)).toEqual([]);
    });

    it('returns empty array if scheme has no requiredDocuments', () => {
      const emptyScheme = { ...sampleScheme, requiredDocuments: [] };
      expect(generatePersonalizedChecklist(emptyScheme)).toEqual([]);
    });
  });
});
