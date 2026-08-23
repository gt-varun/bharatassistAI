import { describe, it, expect } from 'vitest';
import { generateApplicationGuidance } from './applicationGuidanceGenerator.js';
import type { Scheme } from '@bharatassist/shared-types';

describe('applicationGuidanceGenerator', () => {
  const sampleScheme: Scheme = {
    name: 'Karnataka Vidyasiri Scholarship',
    slug: 'karnataka-vidyasiri-scholarship',
    department: 'Department of Collegiate Education',
    level: 'state',
    state: 'Karnataka',
    shortDescription: 'Scholarship scheme for undergraduate students',
    fullDescription: 'Full description...',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Tuition fee reimbursement',
    eligibilityRules: {},
    eligibilitySummaryPlain: 'Plain summary',
    applicationMode: 'online',
    officialPortalUrl: 'https://karnataka.gov.in/vidyasiri',
    applicationFields: [
      {
        fieldName: 'Applicant State',
        instructions: 'State of permanent domicile',
        mandatory: true
      },
      {
        fieldName: 'District',
        instructions: 'Select your permanent district',
        mandatory: true
      },
      {
        fieldName: 'Applicant Age',
        instructions: 'Age as per SSLC marks card',
        mandatory: true
      },
      {
        fieldName: 'Applicant Occupation',
        instructions: 'Current occupation status',
        mandatory: false
      },
      {
        fieldName: 'Social Category',
        instructions: 'Specify your caste category',
        mandatory: true
      }
    ],
    commonMistakes: [
      'Name spelling mismatch with Aadhaar card',
      'Uploading expired income certificate from Taluk office'
    ],
    requiredDocuments: [
      {
        label: 'Bonafide Certificate',
        howToObtain: 'Request from college administration',
        mandatory: true
      },
      {
        label: 'Bank Passbook with IFSC',
        howToObtain: 'From your bank branch for DBT transfer',
        mandatory: true
      }
    ],
    deadline: null,
    status: 'open',
    translations: {},
    lastVerifiedAt: new Date(),
    sourceRef: 'Gov Order 123',
    extractionConfidence: 1.0
  };

  describe('field-by-field guidance and prefill mapping', () => {
    it('converts applicationFields into structured guidance', () => {
      const result = generateApplicationGuidance(sampleScheme);
      expect(result.fieldByFieldGuidance).toHaveLength(5);
      expect(result.fieldByFieldGuidance[0].fieldName).toBe('Applicant State');
      expect(result.fieldByFieldGuidance[0].instructions).toBe('State of permanent domicile');
      expect(result.fieldByFieldGuidance[0].mandatory).toBe(true);
    });

    it('prefills field values from CitizenProfile when matching profile fields exist', () => {
      const profile = {
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        age: 20,
        gender: 'female',
        occupationCategory: 'student',
        category: 'OBC'
      };

      const result = generateApplicationGuidance(sampleScheme, profile);
      const fields = result.fieldByFieldGuidance;

      expect(fields.find((f) => f.fieldName === 'Applicant State')?.prefilledValue).toBe('Karnataka');
      expect(fields.find((f) => f.fieldName === 'District')?.prefilledValue).toBe('Bengaluru Urban');
      expect(fields.find((f) => f.fieldName === 'Applicant Age')?.prefilledValue).toBe(20);
      expect(fields.find((f) => f.fieldName === 'Applicant Occupation')?.prefilledValue).toBe('student');
      expect(fields.find((f) => f.fieldName === 'Social Category')?.prefilledValue).toBe('OBC');
    });

    it('falls back to default instructions when field instructions are empty', () => {
      const schemeWithEmptyInstructions: Scheme = {
        ...sampleScheme,
        applicationFields: [{ fieldName: 'College Name', instructions: '', mandatory: true }]
      };
      const result = generateApplicationGuidance(schemeWithEmptyInstructions);
      expect(result.fieldByFieldGuidance[0].instructions).toBe(
        'Ensure details match official government identity cards.'
      );
    });
  });

  describe('common mistakes handling', () => {
    it('surfaces scheme-specific common mistakes', () => {
      const result = generateApplicationGuidance(sampleScheme);
      expect(result.commonMistakes).toEqual([
        'Name spelling mismatch with Aadhaar card',
        'Uploading expired income certificate from Taluk office'
      ]);
    });

    it('falls back to default common mistakes when scheme list is empty', () => {
      const schemeWithoutMistakes: Scheme = {
        ...sampleScheme,
        commonMistakes: []
      };
      const result = generateApplicationGuidance(schemeWithoutMistakes);
      expect(result.commonMistakes.length).toBeGreaterThan(0);
      expect(result.commonMistakes[0]).toContain('Aadhaar');
    });
  });

  describe('dynamic glossary extraction', () => {
    it('extracts matched glossary definitions based on terms found in fields, mistakes, and documents', () => {
      const result = generateApplicationGuidance(sampleScheme);
      const terms = result.glossary.map((g) => g.term);

      expect(terms).toContain('Aadhaar Seeding');
      expect(terms).toContain('Taluk / Tehsildar Office');
      expect(terms).toContain('Bonafide Certificate');
      expect(terms).toContain('IFSC Code');
      expect(terms).toContain('Direct Benefit Transfer (DBT)');
    });

    it('falls back to default essential glossary terms if no keywords are matched across text', () => {
      const schemeWithNoKeywords: Scheme = {
        ...sampleScheme,
        applicationFields: [{ fieldName: 'Registration Number', instructions: 'Enter roll number', mandatory: false }],
        commonMistakes: ['Entering incorrect roll number format'],
        requiredDocuments: [{ label: 'Marks Card', howToObtain: 'From university website', mandatory: true }]
      };
      const result = generateApplicationGuidance(schemeWithNoKeywords);
      expect(result.glossary).toHaveLength(2);
      expect(result.glossary.some((g) => g.term === 'Aadhaar Seeding')).toBe(true);
      expect(result.glossary.some((g) => g.term === 'Taluk / Tehsildar Office')).toBe(true);
    });
  });

  describe('official portal link validation and readyToApply status', () => {
    it('validates a valid https government portal URL and marks readyToApply as true', () => {
      const result = generateApplicationGuidance(sampleScheme);
      expect(result.officialPortalUrl).toBe('https://karnataka.gov.in/vidyasiri');
      expect(result.portalValid).toBe(true);
      expect(result.readyToApply).toBe(true);
      expect(result.notes).toBeUndefined();
    });

    it('rejects an invalid portal URL and sets readyToApply to false with explanatory note', () => {
      const schemeInvalidUrl: Scheme = {
        ...sampleScheme,
        officialPortalUrl: 'not_a_valid_url'
      };
      const result = generateApplicationGuidance(schemeInvalidUrl);
      expect(result.portalValid).toBe(false);
      expect(result.readyToApply).toBe(false);
      expect(result.notes).toContain('Official application portal URL is currently unverified');
    });

    it('rejects an empty portal URL string', () => {
      const schemeEmptyUrl: Scheme = {
        ...sampleScheme,
        officialPortalUrl: ''
      };
      const result = generateApplicationGuidance(schemeEmptyUrl);
      expect(result.portalValid).toBe(false);
      expect(result.readyToApply).toBe(false);
    });
  });

  describe('edge cases and safety', () => {
    it('handles null and undefined scheme safely without throwing', () => {
      const nullResult = generateApplicationGuidance(null);
      expect(nullResult.fieldByFieldGuidance).toEqual([]);
      expect(nullResult.commonMistakes).toEqual([]);
      expect(nullResult.portalValid).toBe(false);
      expect(nullResult.readyToApply).toBe(false);

      const undefinedResult = generateApplicationGuidance(undefined);
      expect(undefinedResult.portalValid).toBe(false);
    });
  });
});
