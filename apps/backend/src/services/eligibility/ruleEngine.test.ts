import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from './ruleEngine.js';
import { parseIncomeBand, judgeAgainstCeiling } from './incomeBands.js';
import { realSchemes } from '../../scripts/schemes.data.js';
import type { EligibilityRules } from '@bharatassist/shared-types';

/**
 * The rule engine decides whether a citizen is told they can claim a benefit.
 * docs/person-2-eligibility-application.md §5 requires it to be tested
 * against *real* seeded scheme records with known expected outcomes, not
 * synthetic rule sets — the engine is only as trustworthy as the real rules
 * it evaluates. Every case below names an actual scheme from the corpus.
 */

function rulesFor(slug: string): EligibilityRules {
  const scheme = realSchemes.find((s) => s.slug === slug);
  if (!scheme) throw new Error(`Fixture drift: no seeded scheme with slug "${slug}"`);
  return scheme.eligibilityRules as unknown as EligibilityRules;
}

describe('real scheme corpus is present', () => {
  it('covers the slugs these tests rely on', () => {
    for (const slug of [
      'pm-kisan-samman-nidhi',
      'karnataka-vidyasiri-scholarship',
      'ignoaps-senior-citizen-pension',
      'pm-matru-vandana-yojana',
      'igndps-disability-pension',
      'post-matric-scholarship-sc'
    ]) {
      expect(() => rulesFor(slug), slug).not.toThrow();
    }
  });
});

describe('PM-KISAN — landholding farmers, no income ceiling', () => {
  const rules = rulesFor('pm-kisan-samman-nidhi');

  it('accepts a farmer with land', () => {
    const result = evaluateEligibility(rules, {
      age: 30,
      occupationCategory: 'farmer',
      category: 'General',
      landOwnershipAcres: 2
    });
    expect(result.status).toBe('eligible');
    expect(result.missingRequirements).toHaveLength(0);
  });

  it('refuses a student, naming the occupation rule', () => {
    const result = evaluateEligibility(rules, {
      age: 20,
      occupationCategory: 'student',
      category: 'General',
      landOwnershipAcres: 2
    });
    expect(result.status).toBe('not_eligible');
    expect(result.missingRequirements.join(' ')).toMatch(/occupation/i);
  });

  it('refuses a farmer holding no land (additionalConditions gte)', () => {
    const result = evaluateEligibility(rules, {
      age: 30,
      occupationCategory: 'farmer',
      category: 'General',
      landOwnershipAcres: 0
    });
    expect(result.status).toBe('not_eligible');
  });

  it('asks rather than refuses when landholding is simply unanswered', () => {
    const result = evaluateEligibility(rules, {
      age: 30,
      occupationCategory: 'farmer',
      category: 'General'
    });
    expect(result.status).toBe('partially_eligible');
    expect(result.missingRequirements.join(' ')).toMatch(/landOwnershipAcres/);
  });

  it('refuses on an under-age applicant', () => {
    const result = evaluateEligibility(rules, {
      age: 15,
      occupationCategory: 'farmer',
      category: 'General',
      landOwnershipAcres: 2
    });
    expect(result.status).toBe('not_eligible');
    expect(result.missingRequirements.join(' ')).toMatch(/18/);
  });
});

describe('Karnataka Vidyasiri — state, age band, income ceiling, category, education', () => {
  const rules = rulesFor('karnataka-vidyasiri-scholarship');
  const qualified = {
    state: 'Karnataka',
    age: 20,
    income: 200000,
    occupationCategory: 'student',
    category: 'OBC',
    educationLevel: 'undergraduate'
  };

  it('accepts a qualified Karnataka student', () => {
    expect(evaluateEligibility(rules, qualified).status).toBe('eligible');
  });

  it('refuses a resident of another state', () => {
    const result = evaluateEligibility(rules, { ...qualified, state: 'Tamil Nadu' });
    expect(result.status).toBe('not_eligible');
    expect(result.missingRequirements.join(' ')).toMatch(/Karnataka/);
  });

  it('refuses income clearly above the ceiling', () => {
    const result = evaluateEligibility(rules, { ...qualified, income: 500000 });
    expect(result.status).toBe('not_eligible');
    expect(result.missingRequirements.join(' ')).toMatch(/income/i);
  });

  it('accepts income exactly at the ceiling', () => {
    expect(evaluateEligibility(rules, { ...qualified, income: 250000 }).status).toBe('eligible');
  });

  it('refuses an ineligible social category', () => {
    const result = evaluateEligibility(rules, { ...qualified, category: 'General' });
    expect(result.status).toBe('not_eligible');
  });

  it('refuses an education level outside the allowed list (additionalConditions in)', () => {
    const result = evaluateEligibility(rules, { ...qualified, educationLevel: 'secondary' });
    expect(result.status).toBe('not_eligible');
  });

  it('refuses an applicant above the age band', () => {
    expect(evaluateEligibility(rules, { ...qualified, age: 30 }).status).toBe('not_eligible');
  });
});

describe('IGNOAPS — old-age pension', () => {
  const rules = rulesFor('ignoaps-senior-citizen-pension');

  it('accepts a 68-year-old below the income ceiling', () => {
    expect(
      evaluateEligibility(rules, { age: 68, income: 50000, category: 'General' }).status
    ).toBe('eligible');
  });

  it('refuses a 45-year-old, naming the minimum age', () => {
    const result = evaluateEligibility(rules, { age: 45, income: 50000, category: 'General' });
    expect(result.status).toBe('not_eligible');
    expect(result.missingRequirements.join(' ')).toMatch(/60/);
  });

  it('accepts exactly the minimum age (boundary is inclusive)', () => {
    expect(
      evaluateEligibility(rules, { age: 60, income: 50000, category: 'General' }).status
    ).toBe('eligible');
  });
});

describe('PMMVY — gender-restricted scheme', () => {
  const rules = rulesFor('pm-matru-vandana-yojana');

  it('refuses a male applicant', () => {
    const result = evaluateEligibility(rules, { age: 25, gender: 'male', income: 100000 });
    expect(result.status).toBe('not_eligible');
    expect(result.missingRequirements.join(' ')).toMatch(/female/i);
  });

  it('accepts a qualifying woman', () => {
    expect(
      evaluateEligibility(rules, {
        age: 25,
        gender: 'female',
        income: 100000,
        category: 'General'
      }).status
    ).toBe('eligible');
  });
});

describe('IGNDPS — disability threshold via additionalConditions', () => {
  const rules = rulesFor('igndps-disability-pension');

  it('refuses a 40% disability where the scheme requires 80%', () => {
    const result = evaluateEligibility(rules, {
      age: 30,
      income: 50000,
      category: 'General',
      disabilityPercentage: 40
    });
    expect(result.status).toBe('not_eligible');
  });

  it('accepts 80% disability', () => {
    expect(
      evaluateEligibility(rules, {
        age: 30,
        income: 50000,
        category: 'General',
        disabilityPercentage: 80
      }).status
    ).toBe('eligible');
  });
});

describe('determinism and precedence', () => {
  const rules = rulesFor('karnataka-vidyasiri-scholarship');
  const input = {
    state: 'Karnataka',
    age: 20,
    income: 200000,
    occupationCategory: 'student',
    category: 'OBC',
    educationLevel: 'undergraduate'
  };

  it('returns an identical verdict across repeated evaluations', () => {
    const runs = Array.from({ length: 25 }, () => evaluateEligibility(rules, input));
    for (const run of runs) {
      expect(run).toEqual(runs[0]);
    }
  });

  it('does not mutate the caller’s input', () => {
    const snapshot = JSON.parse(JSON.stringify(input));
    evaluateEligibility(rules, input);
    expect(input).toEqual(snapshot);
  });

  it('lets an explicit failure outrank a missing field', () => {
    // Wrong state (explicit failure) with income unanswered (missing).
    const result = evaluateEligibility(rules, {
      state: 'Bihar',
      age: 20,
      occupationCategory: 'student',
      category: 'OBC',
      educationLevel: 'undergraduate'
    });
    expect(result.status).toBe('not_eligible');
  });

  it('treats a scheme with no recorded rules as open', () => {
    const result = evaluateEligibility(undefined, {});
    expect(result.status).toBe('eligible');
  });

  it('reports every unmet criterion, not just the first', () => {
    const result = evaluateEligibility(rules, {
      state: 'Bihar',
      age: 40,
      income: 900000,
      occupationCategory: 'student',
      category: 'General',
      educationLevel: 'secondary'
    });
    expect(result.status).toBe('not_eligible');
    expect(result.missingRequirements.length).toBeGreaterThan(3);
  });
});

describe('income bands', () => {
  it('reads every vocabulary in the codebase', () => {
    expect(parseIncomeBand('below_1l')).toEqual({ min: 0, max: 100000 });
    expect(parseIncomeBand('1l_2_5l')).toEqual({ min: 100000, max: 250000 });
    expect(parseIncomeBand('2_5l_5l')).toEqual({ min: 250000, max: 500000 });
    expect(parseIncomeBand('<2.5L')).toEqual({ min: 0, max: 250000 });
    expect(parseIncomeBand('2.5l_to_5l')).toEqual({ min: 250000, max: 500000 });
    expect(parseIncomeBand('above_8l')).toEqual({ min: 800000, max: Infinity });
    expect(parseIncomeBand('250000')).toEqual({ min: 250000, max: 250000 });
    expect(parseIncomeBand(null)).toBeNull();
  });

  it('judges a band wholly under the ceiling as within', () => {
    expect(judgeAgainstCeiling({ min: 0, max: 100000 }, 250000)).toBe('within');
  });

  it('judges a band wholly above the ceiling as exceeding', () => {
    expect(judgeAgainstCeiling({ min: 500000, max: 800000 }, 250000)).toBe('exceeds');
  });

  it('refuses to guess when a band straddles the ceiling', () => {
    // ₹2.5L–5L against a ₹2.5L ceiling: the bottom clears it, the top does
    // not. Rounding either way would deny or over-promise a benefit.
    expect(judgeAgainstCeiling({ min: 250000, max: 500000 }, 250000)).toBe('unknown');
  });

  it('asks for an exact figure rather than refusing a straddling band', () => {
    const result = evaluateEligibility(rulesFor('karnataka-vidyasiri-scholarship'), {
      state: 'Karnataka',
      age: 20,
      incomeBand: '2_5l_5l',
      occupationCategory: 'student',
      category: 'OBC',
      educationLevel: 'undergraduate'
    });
    expect(result.status).toBe('partially_eligible');
    expect(result.missingRequirements.join(' ')).toMatch(/exact household income/i);
  });

  it('accepts a band wholly within the ceiling', () => {
    const result = evaluateEligibility(rulesFor('karnataka-vidyasiri-scholarship'), {
      state: 'Karnataka',
      age: 20,
      incomeBand: 'below_1l',
      occupationCategory: 'student',
      category: 'OBC',
      educationLevel: 'undergraduate'
    });
    expect(result.status).toBe('eligible');
  });
});

describe('generic operators in additionalConditions', () => {
  const base = (condition: any): EligibilityRules =>
    ({ additionalConditions: [condition] }) as unknown as EligibilityRules;

  it('equals', () => {
    const rules = base({ field: 'isHeadOfFamily', operator: 'equals', value: true });
    expect(evaluateEligibility(rules, { isHeadOfFamily: true }).status).toBe('eligible');
    expect(evaluateEligibility(rules, { isHeadOfFamily: false }).status).toBe('not_eligible');
  });

  it('in', () => {
    const rules = base({ field: 'trade', operator: 'in', value: ['potter', 'tailor'] });
    expect(evaluateEligibility(rules, { trade: 'tailor' }).status).toBe('eligible');
    expect(evaluateEligibility(rules, { trade: 'pilot' }).status).toBe('not_eligible');
  });

  it('not_in', () => {
    const rules = base({ field: 'employer', operator: 'not_in', value: ['government'] });
    expect(evaluateEligibility(rules, { employer: 'private' }).status).toBe('eligible');
    expect(evaluateEligibility(rules, { employer: 'government' }).status).toBe('not_eligible');
  });

  it('gte and lte', () => {
    expect(
      evaluateEligibility(base({ field: 'acres', operator: 'gte', value: 1 }), { acres: 2 }).status
    ).toBe('eligible');
    expect(
      evaluateEligibility(base({ field: 'acres', operator: 'lte', value: 1 }), { acres: 2 }).status
    ).toBe('not_eligible');
  });

  it('between, inclusive at both ends', () => {
    const rules = base({ field: 'score', operator: 'between', value: [10, 20] });
    expect(evaluateEligibility(rules, { score: 10 }).status).toBe('eligible');
    expect(evaluateEligibility(rules, { score: 20 }).status).toBe('eligible');
    expect(evaluateEligibility(rules, { score: 21 }).status).toBe('not_eligible');
  });

  it('matches strings case-insensitively', () => {
    const rules = base({ field: 'trade', operator: 'in', value: ['Potter'] });
    expect(evaluateEligibility(rules, { trade: 'potter' }).status).toBe('eligible');
  });

  it('asks for a value it was never given', () => {
    const rules = base({ field: 'acres', operator: 'gte', value: 1 });
    expect(evaluateEligibility(rules, {}).status).toBe('partially_eligible');
  });

  it('refuses rather than passing on an operator it does not understand', () => {
    const rules = base({ field: 'x', operator: 'sorcery' as any, value: 1 });
    expect(evaluateEligibility(rules, { x: 1 }).status).toBe('not_eligible');
  });
});
