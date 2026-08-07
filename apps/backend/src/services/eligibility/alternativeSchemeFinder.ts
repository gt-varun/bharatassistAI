import type { Scheme, CitizenProfile } from '@bharatassist/shared-types';
import { evaluateEligibility, RuleEngineOutput, EvaluationInput } from './ruleEngine.js';
import { searchSchemes } from '../ai/retrievalService.js';

export interface AlternativeSchemeRecommendation {
  schemeId: string;
  schemeName: string;
  reasonRecommended: string;
  matchedCriteria: string[];
}

/**
 * Structured inspection of why a scheme failed against a citizen profile.
 */
interface StructuredFailureReasons {
  incomeFailed: boolean;
  stateFailed: boolean;
  ageFailed: boolean;
  occupationFailed: boolean;
  categoryFailed: boolean;
}

/**
 * Evaluates structured rules of a scheme against a profile to pinpoint exact failure domains
 * without relying on string parsing.
 */
function analyzeStructuredFailures(
  failedScheme: Scheme,
  profile: EvaluationInput
): StructuredFailureReasons {
  const rules = failedScheme.eligibilityRules ?? {};

  // Income Failure
  let incomeFailed = false;
  if (rules.incomeMax !== undefined && rules.incomeMax !== null) {
    const userIncome = typeof profile.income === 'number' ? profile.income : null;
    if (userIncome !== null && userIncome > rules.incomeMax) {
      incomeFailed = true;
    }
  }

  // State Failure
  let stateFailed = false;
  if (rules.state && rules.state.length > 0 && profile.state) {
    const isAllState = rules.state.some(
      (s) => s.toLowerCase() === 'all' || s.toLowerCase() === 'india' || s.toLowerCase() === 'national'
    );
    if (!isAllState) {
      const matched = rules.state.some((s) => s.toLowerCase() === profile.state?.toLowerCase());
      if (!matched) {
        stateFailed = true;
      }
    }
  }

  // Age Failure
  let ageFailed = false;
  if (typeof profile.age === 'number') {
    if (rules.ageMin !== undefined && rules.ageMin !== null && profile.age < rules.ageMin) {
      ageFailed = true;
    }
    if (rules.ageMax !== undefined && rules.ageMax !== null && profile.age > rules.ageMax) {
      ageFailed = true;
    }
  }

  // Occupation Failure
  let occupationFailed = false;
  if (rules.occupationCategory && rules.occupationCategory.length > 0 && profile.occupationCategory) {
    const userOcc = profile.occupationCategory.toLowerCase();
    const matched = rules.occupationCategory.some((o) => o.toLowerCase() === userOcc);
    if (!matched) {
      occupationFailed = true;
    }
  }

  // Category Failure
  let categoryFailed = false;
  if (rules.categoryRestriction && rules.categoryRestriction.length > 0 && profile.category) {
    const userCat = profile.category.toLowerCase();
    const matched = rules.categoryRestriction.some((c) => c.toLowerCase() === userCat);
    if (!matched) {
      categoryFailed = true;
    }
  }

  return {
    incomeFailed,
    stateFailed,
    ageFailed,
    occupationFailed,
    categoryFailed
  };
}

/**
 * Deterministically finds alternative schemes for a citizen based on structured failure reasons.
 *
 * Uses shared retrievalService `searchSchemes` to fetch candidate schemes from the database,
 * evaluates them against the profile, ranks them deterministically, and deduplicates recommendations.
 */
export async function findAlternativeSchemes(
  failedScheme: Scheme,
  profile: EvaluationInput = {},
  _evaluationResult?: RuleEngineOutput,
  customCandidatePool?: Scheme[]
): Promise<AlternativeSchemeRecommendation[]> {
  const failedId = String(failedScheme._id || '');
  const failedSlug = failedScheme.slug;

  // Analyze structured failure domains
  const failures = analyzeStructuredFailures(failedScheme, profile);

  // 1. Fetch Candidate Schemes from Shared Retrieval Service (or custom candidate pool)
  let candidateSchemes: Scheme[] = [];
  if (customCandidatePool && customCandidatePool.length > 0) {
    candidateSchemes = customCandidatePool;
  } else {
    try {
      const searchResult = await searchSchemes({ limit: 50 });
      candidateSchemes = searchResult.schemes;
    } catch {
      candidateSchemes = [];
    }
  }

  // 2. Filter & Evaluate Candidates
  const scoredCandidates: Array<{
    scheme: Scheme;
    evalResult: RuleEngineOutput;
    score: number;
    reasonRecommended: string;
  }> = [];

  const seenSchemeIds = new Set<string>();

  for (const candidate of candidateSchemes) {
    const candId = String(candidate._id || '');
    const candSlug = candidate.slug;

    // Rule 5: Never suggest the same scheme or closed schemes or duplicates
    if (
      (failedId && candId === failedId) ||
      (failedSlug && candSlug === failedSlug) ||
      candidate.status === 'closed' ||
      seenSchemeIds.has(candId || candSlug)
    ) {
      continue;
    }

    // Rule 6: an "alternative" has to serve the same need. A citizen refused
    // a scholarship wants another scholarship, not a pension that happens to
    // have no income ceiling. When both records declare who they are for,
    // require at least one segment in common.
    const failedSegments = failedScheme.targetSegments ?? [];
    const candidateSegments = candidate.targetSegments ?? [];
    const sharedSegments = failedSegments.filter((seg) => candidateSegments.includes(seg));
    if (failedSegments.length > 0 && candidateSegments.length > 0 && sharedSegments.length === 0) {
      continue;
    }

    // Evaluate candidate deterministically using ruleEngine
    const evalResult = evaluateEligibility(candidate.eligibilityRules, profile);

    // Only consider eligible or partially eligible candidates
    if (evalResult.status === 'not_eligible') {
      continue;
    }

    // Deduplicate
    seenSchemeIds.add(candId || candSlug);

    // Calculate deterministic relevance score and tailored recommendation reason
    let score = evalResult.status === 'eligible' ? 10 : 5;
    let reasonRecommended = 'Matches your citizen profile criteria';

    // Serving the same audience is the strongest signal of a real alternative.
    if (sharedSegments.length > 0) {
      score += 8 * sharedSegments.length;
    }

    const candRules = candidate.eligibilityRules ?? {};

    if (failures.incomeFailed) {
      if (candRules.incomeMax === null || candRules.incomeMax === undefined) {
        score += 5;
        reasonRecommended = 'No maximum household income limit restrictions';
      } else if (
        failedScheme.eligibilityRules?.incomeMax &&
        candRules.incomeMax > failedScheme.eligibilityRules.incomeMax
      ) {
        score += 5;
        reasonRecommended = `Supports higher annual household income limits (up to ₹${candRules.incomeMax.toLocaleString('en-IN')})`;
      }
    } else if (failures.stateFailed) {
      if (candidate.level === 'central') {
        score += 5;
        reasonRecommended = 'Central government scheme available nationwide across all states';
      } else if (profile.state && candidate.state?.toLowerCase() === profile.state.toLowerCase()) {
        score += 5;
        reasonRecommended = `Official state scheme available in ${profile.state}`;
      }
    } else if (failures.ageFailed) {
      score += 4;
      reasonRecommended = `Eligible for your age group (${profile.age ?? 'specified'} years)`;
    } else if (failures.occupationFailed) {
      score += 4;
      reasonRecommended = `Specifically targets your occupation category (${profile.occupationCategory ?? 'specified'})`;
    } else if (failures.categoryFailed) {
      score += 4;
      reasonRecommended = `Open to ${profile.category ?? 'all'} social category applicants`;
    }

    scoredCandidates.push({
      scheme: candidate,
      evalResult,
      score,
      reasonRecommended
    });
  }

  // 3. Deterministic Ranking Logic:
  // Sort by score DESC, then by scheme name ASC (tie-breaker for guaranteed deterministic ordering)
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.scheme.name.localeCompare(b.scheme.name);
  });

  // Top 5 recommendations
  return scoredCandidates.slice(0, 5).map((item) => ({
    schemeId: String(item.scheme._id || item.scheme.slug),
    schemeName: item.scheme.name,
    reasonRecommended: item.reasonRecommended,
    matchedCriteria: item.evalResult.reasons
  }));
}
