import type { Scheme, CitizenProfile } from '@bharatassist/shared-types';

export interface ScoredScheme {
  scheme: Scheme;
  score: number;
  matchedCriteria: string[];
}

const ALL_STATE_TOKENS = ['all', 'india', 'national', 'all india', 'any'];

function ruleCoversState(rules: Scheme['eligibilityRules'] | undefined, state: string): boolean {
  // No explicit `eligibilityRules.state` override present — this function
  // only ever *widens* coverage beyond the scheme's top-level `state`
  // field (e.g. a multi-state programme), so an absent list adds nothing.
  if (!rules?.state?.length) return false;
  return rules.state.some(
    (s) => ALL_STATE_TOKENS.includes(s.toLowerCase()) || s.toLowerCase() === state.toLowerCase()
  );
}

/**
 * Hard filters: state and category eligibility bounds (docs/person-3-ai-recommendations.md §3.3).
 * A scheme that fails one of these is not a plausible match at all, so it is
 * excluded outright rather than merely scored lower. Missing profile fields
 * never trigger a hard exclusion — only `state` is mandatory on a
 * CitizenProfile, so a sparse profile should still see recommendations,
 * just without the benefit of a bound it hasn't provided.
 */
export function passesHardFilters(scheme: Scheme, profile: CitizenProfile): boolean {
  if (scheme.status === 'closed') return false;

  if (profile.state) {
    const stateDeclaredMatch =
      scheme.level === 'central' ||
      !scheme.state ||
      scheme.state.toLowerCase() === profile.state.toLowerCase();
    const rulesAllow = ruleCoversState(scheme.eligibilityRules, profile.state);
    if (!stateDeclaredMatch && !rulesAllow) return false;
  }

  const categoryRestriction = scheme.eligibilityRules?.categoryRestriction;
  if (categoryRestriction?.length && profile.category) {
    const matched = categoryRestriction.some((c) => c.toLowerCase() === profile.category!.toLowerCase());
    if (!matched) return false;
  }

  const genderRestriction = scheme.eligibilityRules?.genderRestriction;
  if (genderRestriction && profile.gender) {
    const norm = genderRestriction.toLowerCase();
    if (norm !== 'all' && norm !== 'any' && norm !== profile.gender.toLowerCase()) return false;
  }

  const ageMin = scheme.eligibilityRules?.ageMin;
  const ageMax = scheme.eligibilityRules?.ageMax;
  if (typeof profile.age === 'number') {
    if (typeof ageMin === 'number' && profile.age < ageMin) return false;
    if (typeof ageMax === 'number' && profile.age > ageMax) return false;
  }

  return true;
}

/** Matches the income bands used across the Citizen Profile / Eligibility Checker. */
const INCOME_BAND_CEILING: Record<string, number> = {
  '<2.5L': 250000,
  '2.5L-5L': 500000,
  '>5L': Infinity
};

/**
 * Soft score: segment tag match, income band fit, recency, popularity
 * (docs/person-3-ai-recommendations.md §3.3). Every point added here also
 * appends a `matchedCriteria` explanation — recommendations must always show
 * why a scheme was recommended (PRD §11.14), never a bare score.
 */
export function scoreScheme(
  scheme: Scheme,
  profile: CitizenProfile,
  popularity: Map<string, number> = new Map()
): { score: number; matchedCriteria: string[] } {
  let score = 0;
  const matchedCriteria: string[] = [];

  if (profile.occupationCategory && scheme.targetSegments?.includes(profile.occupationCategory)) {
    score += 10;
    matchedCriteria.push(`Matches your occupation category (${profile.occupationCategory})`);
  }

  if (profile.state && scheme.state && scheme.state.toLowerCase() === profile.state.toLowerCase()) {
    score += 6;
    matchedCriteria.push(`State scheme for ${scheme.state}`);
  } else if (scheme.level === 'central') {
    score += 2;
    matchedCriteria.push('Central scheme, available in every state');
  }

  if (profile.incomeBand && scheme.eligibilityRules?.incomeMax != null) {
    const ceiling = INCOME_BAND_CEILING[profile.incomeBand];
    if (ceiling !== undefined && ceiling <= scheme.eligibilityRules.incomeMax) {
      score += 5;
      matchedCriteria.push(
        `Income limit (₹${scheme.eligibilityRules.incomeMax.toLocaleString('en-IN')}) covers your income band`
      );
    }
  }

  if (profile.disabilityStatus && scheme.targetSegments?.includes('pwd')) {
    score += 8;
    matchedCriteria.push('Open to persons with disabilities');
  }

  if (profile.businessType && scheme.targetSegments?.includes('msme')) {
    score += 6;
    matchedCriteria.push('Relevant to your business type');
  }

  if (profile.landOwnershipAcres != null && scheme.targetSegments?.includes('farmer')) {
    score += 6;
    matchedCriteria.push('Relevant to landholding farmers');
  }

  // Recency: a record verified in the last 90 days scores a small bump — a
  // fresher record is more likely to carry a current deadline and amount.
  const verifiedAt = scheme.lastVerifiedAt ? new Date(scheme.lastVerifiedAt).getTime() : 0;
  const daysSinceVerified = verifiedAt ? (Date.now() - verifiedAt) / (1000 * 60 * 60 * 24) : Infinity;
  if (daysSinceVerified <= 90) score += 2;

  // Popularity: how many citizens have saved this scheme. Logarithmic so one
  // very popular scheme doesn't drown out every relevance signal above it.
  const saveCount = popularity.get(String(scheme._id)) ?? 0;
  if (saveCount > 0) score += Math.min(4, Math.log2(saveCount + 1));

  return { score, matchedCriteria };
}

/** Hard-filters then soft-scores a candidate pool, best match first. */
export function rankSchemes(
  schemes: Scheme[],
  profile: CitizenProfile,
  popularity: Map<string, number> = new Map()
): ScoredScheme[] {
  return schemes
    .filter((scheme) => passesHardFilters(scheme, profile))
    .map((scheme) => {
      const { score, matchedCriteria } = scoreScheme(scheme, profile, popularity);
      return { scheme, score, matchedCriteria };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.scheme.name.localeCompare(b.scheme.name);
    });
}
