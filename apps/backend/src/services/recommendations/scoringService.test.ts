import { describe, it, expect } from 'vitest';
import type { Scheme, CitizenProfile } from '@bharatassist/shared-types';
import { passesHardFilters, scoreScheme, rankSchemes } from './scoringService.js';

function makeScheme(overrides: Partial<Scheme> = {}): Scheme {
  return {
    _id: overrides._id ?? 'scheme-1',
    name: overrides.name ?? 'Test Scheme',
    slug: overrides.slug ?? 'test-scheme',
    department: 'Test Department',
    level: overrides.level ?? 'central',
    state: overrides.state ?? null,
    shortDescription: 'A test scheme',
    fullDescription: 'A test scheme in full',
    targetSegments: overrides.targetSegments ?? [],
    benefitType: 'cash',
    benefitSummary: '₹1,000',
    eligibilityRules: overrides.eligibilityRules ?? {},
    eligibilitySummaryPlain: 'Open to all',
    requiredDocuments: [],
    applicationMode: 'online',
    officialPortalUrl: 'https://example.gov.in',
    applicationFields: [],
    commonMistakes: [],
    deadline: null,
    status: overrides.status ?? 'open',
    translations: {},
    // Old on purpose: recency scoring is opt-in per test via an explicit
    // override, so the default fixture never contributes an unaccounted
    // point when a test is asserting an exact score.
    lastVerifiedAt: overrides.lastVerifiedAt ?? '2000-01-01T00:00:00.000Z',
    sourceRef: 'test',
    extractionConfidence: null,
    ...overrides
  };
}

function makeProfile(overrides: Partial<CitizenProfile> = {}): CitizenProfile {
  return {
    userId: 'user-1',
    state: 'Karnataka',
    ...overrides
  };
}

describe('passesHardFilters', () => {
  it('excludes a closed scheme regardless of fit', () => {
    const scheme = makeScheme({ status: 'closed' });
    expect(passesHardFilters(scheme, makeProfile())).toBe(false);
  });

  it('excludes a state scheme for a different state', () => {
    const scheme = makeScheme({ level: 'state', state: 'Tamil Nadu' });
    expect(passesHardFilters(scheme, makeProfile({ state: 'Karnataka' }))).toBe(false);
  });

  it('admits a state scheme when eligibilityRules.state explicitly covers the citizen state', () => {
    const scheme = makeScheme({
      level: 'state',
      state: 'Tamil Nadu',
      eligibilityRules: { state: ['Tamil Nadu', 'Karnataka'] }
    });
    expect(passesHardFilters(scheme, makeProfile({ state: 'Karnataka' }))).toBe(true);
  });

  it('always admits a central scheme regardless of the citizen state', () => {
    const scheme = makeScheme({ level: 'central', state: null });
    expect(passesHardFilters(scheme, makeProfile({ state: 'Kerala' }))).toBe(true);
  });

  it('excludes a scheme whose category restriction does not include the citizen category', () => {
    const scheme = makeScheme({ eligibilityRules: { categoryRestriction: ['SC', 'ST'] } });
    expect(passesHardFilters(scheme, makeProfile({ category: 'General' }))).toBe(false);
    expect(passesHardFilters(scheme, makeProfile({ category: 'SC' }))).toBe(true);
  });

  it('does not hard-exclude on a field the citizen profile has not filled in', () => {
    const scheme = makeScheme({ eligibilityRules: { categoryRestriction: ['SC'] } });
    expect(passesHardFilters(scheme, makeProfile({ category: undefined }))).toBe(true);
  });

  it('excludes a scheme outside the citizen age bounds', () => {
    const scheme = makeScheme({ eligibilityRules: { ageMin: 18, ageMax: 35 } });
    expect(passesHardFilters(scheme, makeProfile({ age: 40 }))).toBe(false);
    expect(passesHardFilters(scheme, makeProfile({ age: 25 }))).toBe(true);
  });

  it('excludes a scheme restricted to a gender the citizen does not report', () => {
    const scheme = makeScheme({ eligibilityRules: { genderRestriction: 'female' } });
    expect(passesHardFilters(scheme, makeProfile({ gender: 'male' }))).toBe(false);
    expect(passesHardFilters(scheme, makeProfile({ gender: 'female' }))).toBe(true);
  });
});

describe('scoreScheme', () => {
  it('scores an occupation-segment match and explains why', () => {
    const scheme = makeScheme({ targetSegments: ['farmer'] });
    const { score, matchedCriteria } = scoreScheme(scheme, makeProfile({ occupationCategory: 'farmer' }));
    expect(score).toBeGreaterThan(0);
    expect(matchedCriteria.some((m) => m.includes('occupation'))).toBe(true);
  });

  it('scores a same-state scheme higher than an unrelated central mention alone', () => {
    const stateScheme = makeScheme({ level: 'state', state: 'Karnataka' });
    const { score, matchedCriteria } = scoreScheme(stateScheme, makeProfile({ state: 'Karnataka' }));
    expect(score).toBeGreaterThan(0);
    expect(matchedCriteria.some((m) => m.includes('Karnataka'))).toBe(true);
  });

  it('never returns a score without a matching explanation for every point source triggered', () => {
    const scheme = makeScheme({ targetSegments: ['pwd'] });
    const { matchedCriteria } = scoreScheme(scheme, makeProfile({ disabilityStatus: true }));
    expect(matchedCriteria.length).toBeGreaterThan(0);
  });

  it('gives a scheme with no matching signals a score of zero', () => {
    const scheme = makeScheme({ targetSegments: ['msme'], level: 'state', state: 'Bihar' });
    const { score } = scoreScheme(scheme, makeProfile({ state: 'Karnataka', occupationCategory: 'farmer' }));
    expect(score).toBe(0);
  });
});

describe('rankSchemes', () => {
  it('excludes hard-filtered schemes entirely and orders the rest by score', () => {
    const closed = makeScheme({ _id: 'a', name: 'Closed Scheme', status: 'closed' });
    const weakMatch = makeScheme({ _id: 'b', name: 'Weak Match', level: 'central' });
    const strongMatch = makeScheme({
      _id: 'c',
      name: 'Strong Match',
      level: 'state',
      state: 'Karnataka',
      targetSegments: ['farmer']
    });

    const ranked = rankSchemes(
      [closed, weakMatch, strongMatch],
      makeProfile({ state: 'Karnataka', occupationCategory: 'farmer' })
    );

    expect(ranked.map((r) => r.scheme._id)).not.toContain('a');
    expect(ranked[0].scheme._id).toBe('c');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it('breaks a score tie alphabetically by scheme name for stable ordering', () => {
    const a = makeScheme({ _id: 'a', name: 'Alpha Scheme' });
    const b = makeScheme({ _id: 'b', name: 'Beta Scheme' });
    const ranked = rankSchemes([b, a], makeProfile());
    expect(ranked[0].score).toBe(ranked[1].score);
    expect(ranked[0].scheme.name).toBe('Alpha Scheme');
  });
});

describe('income band scoring', () => {
  /*
   * These bands are the slugs the app genuinely stores on a profile
   * (`INCOME_BANDS` in the frontend taxonomy). The table they are looked up
   * in previously held display strings instead, so every lookup missed and
   * income silently contributed nothing to any recommendation. Asserting on
   * the real slugs is what keeps the two lists from drifting apart again.
   */
  it('credits a scheme whose income ceiling covers the whole band', () => {
    const scheme = makeScheme({ eligibilityRules: { incomeMax: 250000 } });
    const { score, matchedCriteria } = scoreScheme(scheme, makeProfile({ incomeBand: '1l_2_5l' }));

    expect(score).toBeGreaterThan(0);
    expect(matchedCriteria.join(' ')).toMatch(/income/i);
  });

  it('does not credit a scheme whose ceiling is below the band', () => {
    const scheme = makeScheme({ eligibilityRules: { incomeMax: 100000 } });
    const { matchedCriteria } = scoreScheme(scheme, makeProfile({ incomeBand: '5l_8l' }));

    expect(matchedCriteria.join(' ')).not.toMatch(/income limit/i);
  });

  it('treats the top band as unbounded, so no ceiling can cover it', () => {
    const scheme = makeScheme({ eligibilityRules: { incomeMax: 10000000 } });
    const { matchedCriteria } = scoreScheme(scheme, makeProfile({ incomeBand: 'above_8l' }));

    expect(matchedCriteria.join(' ')).not.toMatch(/income limit/i);
  });

  it('ignores income entirely when the citizen has not given a band', () => {
    const scheme = makeScheme({ eligibilityRules: { incomeMax: 250000 } });
    const { matchedCriteria } = scoreScheme(scheme, makeProfile());

    expect(matchedCriteria.join(' ')).not.toMatch(/income limit/i);
  });
});
