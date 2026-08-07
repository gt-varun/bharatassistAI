import { describe, it, expect } from 'vitest';
import { parseExtractionResponse, scoreExtraction, type ExtractedScheme } from './extractor.js';

const VALID_JSON = JSON.stringify({
  name: 'Test State Farmer Subsidy',
  department: 'Department of Agriculture',
  level: 'state',
  state: 'Karnataka',
  shortDescription: 'A subsidy for small and marginal farmers buying irrigation equipment.',
  fullDescription: 'Full text of the notification describing the subsidy in detail.',
  targetSegments: ['farmer'],
  benefitType: 'subsidy',
  benefitSummary: '50% subsidy on drip irrigation equipment, capped at ₹50,000.',
  eligibilityRules: { state: ['Karnataka'], incomeMax: 250000, occupationCategory: ['farmer'] },
  eligibilitySummaryPlain: 'Open to Karnataka farmers with landholding under 5 acres.',
  requiredDocuments: [{ label: 'Land Records', howToObtain: 'Taluk office', mandatory: true }],
  applicationMode: 'online',
  officialPortalUrl: 'https://raitamitra.karnataka.gov.in',
  applicationFields: [],
  commonMistakes: [],
  deadline: null,
  status: 'open',
  modelConfidence: 0.9
});

describe('parseExtractionResponse', () => {
  it('parses a clean JSON object', () => {
    const result = parseExtractionResponse(VALID_JSON);
    expect(result?.name).toBe('Test State Farmer Subsidy');
  });

  it('strips a markdown code fence around the JSON', () => {
    const fenced = '```json\n' + VALID_JSON + '\n```';
    const result = parseExtractionResponse(fenced);
    expect(result?.name).toBe('Test State Farmer Subsidy');
  });

  it('strips prose the model added before or after the JSON object', () => {
    const withProse = `Here is the extracted scheme:\n${VALID_JSON}\nLet me know if you need anything else.`;
    const result = parseExtractionResponse(withProse);
    expect(result?.name).toBe('Test State Farmer Subsidy');
  });

  it('returns null for malformed JSON rather than throwing', () => {
    expect(parseExtractionResponse('{ this is not valid json')).toBeNull();
    expect(parseExtractionResponse('')).toBeNull();
    expect(parseExtractionResponse('no braces at all')).toBeNull();
  });

  it('returns null when the JSON does not satisfy the required shape', () => {
    // "name" is required and must be at least 3 characters.
    expect(parseExtractionResponse(JSON.stringify({ name: 'ab' }))).toBeNull();
  });

  it('fills in defaults for fields the model omitted', () => {
    const minimal = JSON.stringify({ name: 'Minimal Scheme Name' });
    const result = parseExtractionResponse(minimal);
    expect(result?.targetSegments).toEqual([]);
    expect(result?.requiredDocuments).toEqual([]);
    expect(result?.status).toBe('rolling');
  });
});

describe('scoreExtraction', () => {
  const fullRecord = parseExtractionResponse(VALID_JSON) as ExtractedScheme;

  it('scores a complete, internally-consistent, gov-domain extraction highly', () => {
    const score = scoreExtraction(fullRecord, 'https://raitamitra.karnataka.gov.in');
    expect(score).toBeGreaterThanOrEqual(0.75);
  });

  it('scores a near-empty extraction low', () => {
    const sparse = parseExtractionResponse(JSON.stringify({ name: 'Sparse Scheme Name' })) as ExtractedScheme;
    const score = scoreExtraction(sparse, 'https://example.com');
    expect(score).toBeLessThan(0.5);
  });

  it('penalises an official portal URL that is not on the gov-domain allow-list', () => {
    const untrusted = { ...fullRecord, officialPortalUrl: 'https://not-a-gov-site.example.com' };
    const scoreWithGovSource = scoreExtraction(untrusted, 'https://not-a-gov-site.example.com');
    const scoreWithGovMatch = scoreExtraction(fullRecord, 'https://raitamitra.karnataka.gov.in');
    expect(scoreWithGovSource).toBeLessThan(scoreWithGovMatch);
  });

  it('penalises an internally inconsistent age range (ageMin > ageMax)', () => {
    const inconsistent = {
      ...fullRecord,
      eligibilityRules: { ...fullRecord.eligibilityRules, ageMin: 40, ageMax: 18 }
    };
    const consistentScore = scoreExtraction(fullRecord, 'https://raitamitra.karnataka.gov.in');
    const inconsistentScore = scoreExtraction(inconsistent, 'https://raitamitra.karnataka.gov.in');
    expect(inconsistentScore).toBeLessThan(consistentScore);
  });

  it('never trusts the model self-reported confidence as the returned score', () => {
    const overconfident = { ...fullRecord, modelConfidence: 1, name: 'ab' } as unknown as ExtractedScheme;
    // Even a maximal self-reported confidence does not raise the score —
    // scoreExtraction only reads objective fields, never modelConfidence.
    const score = scoreExtraction(overconfident, 'https://example.com');
    expect(score).toBeLessThan(1);
  });
});
