import type { Scheme } from '@bharatassist/shared-types';
import { evaluateEligibility, type EvaluationInput } from '../eligibility/ruleEngine.js';
import { searchSchemes } from '../ai/retrievalService.js';

export interface CrossRecommendation {
  scheme: Scheme;
  status: 'eligible' | 'partially_eligible';
  matchedCriteria: string[];
}

/**
 * "Because you're eligible for X, you may also qualify for Y" (PRD §11.14,
 * triggered per §17.3 after a positive eligibility result).
 *
 * Deliberately reuses Person 2's deterministic rule engine rather than
 * ranking by similarity alone (docs/rules.md #18 — eligibility status is
 * always computed by the rule engine, never guessed): a cross-recommendation
 * only surfaces if the citizen's own profile genuinely clears the candidate
 * scheme's rules, not merely because it shares a segment tag with the scheme
 * they just qualified for.
 */
export async function findCrossRecommendations(
  sourceScheme: Scheme,
  profile: EvaluationInput,
  limit = 5
): Promise<CrossRecommendation[]> {
  const { schemes: candidates } = await searchSchemes({ limit: 50 });

  const sourceSegments = sourceScheme.targetSegments ?? [];
  const sourceId = String(sourceScheme._id || '');
  const sourceSlug = sourceScheme.slug;

  const scored: Array<{
    scheme: Scheme;
    status: 'eligible' | 'partially_eligible';
    matchedCriteria: string[];
    rank: number;
  }> = [];

  for (const candidate of candidates) {
    const candId = String(candidate._id || '');
    if (candId === sourceId || candidate.slug === sourceSlug) continue;
    if (candidate.status === 'closed') continue;

    const candidateSegments = candidate.targetSegments ?? [];
    const sharedSegments = sourceSegments.filter((s) => candidateSegments.includes(s));
    const sameState = Boolean(sourceScheme.state && candidate.state && sourceScheme.state === candidate.state);

    // A cross-recommendation still has to serve a similar citizen — require
    // some real overlap with the scheme they just qualified for, rather than
    // surfacing an unrelated central scheme just because everyone clears it.
    if (sharedSegments.length === 0 && !sameState && candidate.level !== 'central') continue;

    const evalResult = evaluateEligibility(candidate.eligibilityRules, profile);
    if (evalResult.status === 'not_eligible') continue;

    scored.push({
      scheme: candidate,
      status: evalResult.status as 'eligible' | 'partially_eligible',
      matchedCriteria: evalResult.reasons,
      rank: (evalResult.status === 'eligible' ? 100 : 50) + sharedSegments.length * 5
    });
  }

  scored.sort((a, b) => b.rank - a.rank || a.scheme.name.localeCompare(b.scheme.name));

  return scored.slice(0, limit).map(({ scheme, status, matchedCriteria }) => ({
    scheme,
    status,
    matchedCriteria
  }));
}
