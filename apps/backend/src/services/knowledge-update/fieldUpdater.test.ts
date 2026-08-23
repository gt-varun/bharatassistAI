import { describe, it, expect } from 'vitest';
import { computeFieldChanges, isEmptyValue } from './fieldUpdater.js';

describe('isEmptyValue', () => {
  it('treats null, undefined, blank strings, empty arrays and empty objects as empty', () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue('')).toBe(true);
    expect(isEmptyValue('   ')).toBe(true);
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue({})).toBe(true);
  });

  it('treats real values as non-empty', () => {
    expect(isEmptyValue('₹6000')).toBe(false);
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue(['x'])).toBe(false);
    expect(isEmptyValue({ incomeMax: 250000 })).toBe(false);
  });
});

describe('computeFieldChanges', () => {
  const existing = {
    name: 'PM-KISAN',
    department: 'Ministry of Agriculture',
    level: 'central',
    state: null,
    shortDescription: 'Income support for farmers.',
    fullDescription: 'Full description text.',
    targetSegments: ['farmer'],
    benefitType: 'cash',
    benefitSummary: '₹6,000 per year',
    eligibilityRules: { occupationCategory: ['farmer'] },
    eligibilitySummaryPlain: 'Any landholding farmer family.',
    requiredDocuments: [{ label: 'Aadhaar', howToObtain: '', mandatory: true }],
    applicationMode: 'online',
    officialPortalUrl: 'https://pmkisan.gov.in',
    applicationFields: [],
    commonMistakes: ['Bank account not linked to Aadhaar'],
    deadline: null,
    status: 'open'
  };

  it('only includes fields that actually changed', () => {
    const extracted = { ...existing, benefitSummary: '₹8,000 per year' };
    const { changedFields, setPayload } = computeFieldChanges(existing, extracted);
    expect(changedFields).toEqual(['benefitSummary']);
    expect(setPayload).toEqual({ benefitSummary: '₹8,000 per year' });
  });

  it('never lets an empty extracted value overwrite real existing data', () => {
    const extracted = { ...existing, commonMistakes: [], requiredDocuments: [] };
    const { changedFields, setPayload } = computeFieldChanges(existing, extracted);
    expect(changedFields).not.toContain('commonMistakes');
    expect(changedFields).not.toContain('requiredDocuments');
    expect(setPayload.commonMistakes).toBeUndefined();
    expect(setPayload.requiredDocuments).toBeUndefined();
  });

  it('does allow a real value to replace an existing empty one', () => {
    const sparseExisting = { ...existing, commonMistakes: [] };
    const extracted = { ...existing, commonMistakes: ['New mistake to avoid'] };
    const { changedFields, setPayload } = computeFieldChanges(sparseExisting, extracted);
    expect(changedFields).toContain('commonMistakes');
    expect(setPayload.commonMistakes).toEqual(['New mistake to avoid']);
  });

  it('returns no changes at all when the extraction exactly matches the existing record', () => {
    const { changedFields, setPayload } = computeFieldChanges(existing, existing);
    expect(changedFields).toEqual([]);
    expect(setPayload).toEqual({});
  });

  it('detects a nested eligibilityRules change as a single field-level change', () => {
    const extracted = { ...existing, eligibilityRules: { occupationCategory: ['farmer'], incomeMax: 250000 } };
    const { changedFields } = computeFieldChanges(existing, extracted);
    expect(changedFields).toEqual(['eligibilityRules']);
  });

  it('treats every provided field as changed for a brand new scheme (no existing record)', () => {
    // The empty-value guard only protects a field that already holds real
    // data — with no existing record there is nothing to protect, so even
    // an explicit empty array counts as "this is the value to set".
    const extracted = { name: 'New Scheme', targetSegments: ['women'], commonMistakes: [] };
    const { changedFields, setPayload } = computeFieldChanges(null, extracted);
    expect(changedFields).toEqual(expect.arrayContaining(['name', 'targetSegments', 'commonMistakes']));
    expect(setPayload.name).toBe('New Scheme');
    expect(setPayload.commonMistakes).toEqual([]);
  });
});
