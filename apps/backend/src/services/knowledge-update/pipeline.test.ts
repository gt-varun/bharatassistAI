import { describe, it, expect } from 'vitest';
import {
  slugify,
  pickBestCandidate,
  resolvePortalUrl,
  summarizeDiff,
  buildChangeReason,
  computeCombinedScore
} from './pipeline.js';

describe('slugify', () => {
  it('produces a URL-safe slug from a scheme name', () => {
    expect(slugify('PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)')).toBe('pm-kisan-pradhan-mantri-kisan-samman-nidhi');
  });

  it('collapses whitespace and strips punctuation', () => {
    expect(slugify('  Widow   Pension, Scheme!! ')).toBe('widow-pension-scheme');
  });
});

describe('pickBestCandidate', () => {
  const widowPension = { name: 'Indira Gandhi National Widow Pension Scheme', slug: 'ignwps-widow-pension' };
  const oldAgePension = { name: 'Indira Gandhi National Old Age Pension Scheme', slug: 'ignoaps-senior-citizen-pension' };

  it('returns null for an empty candidate list', () => {
    expect(pickBestCandidate('Anything', [])).toBeNull();
  });

  it('returns the only candidate without checking name overlap', () => {
    expect(pickBestCandidate('Completely Unrelated Name', [widowPension])).toBe(widowPension);
  });

  it('picks the candidate with the strongest name-token overlap', () => {
    const result = pickBestCandidate('Indira Gandhi National Widow Pension Yojana', [widowPension, oldAgePension]);
    expect(result).toBe(widowPension);
  });

  it('returns null when two candidates are an equally weak match — ambiguous, not guessed', () => {
    const result = pickBestCandidate('Indira Gandhi National Pension Scheme', [widowPension, oldAgePension]);
    expect(result).toBeNull();
  });
});

describe('resolvePortalUrl', () => {
  it('uses the extracted URL when it is on the gov-domain allow-list', () => {
    const result = resolvePortalUrl('https://pmkisan.gov.in', null);
    expect(result).toEqual({ url: 'https://pmkisan.gov.in', hardFail: false });
  });

  it('falls back to a trusted existing URL rather than an untrusted extracted one', () => {
    const result = resolvePortalUrl('https://scraped-mirror.example.com', 'https://pmkisan.gov.in');
    expect(result).toEqual({ url: 'https://pmkisan.gov.in', hardFail: false });
  });

  it('hard-fails when neither the extracted nor the existing URL is trustworthy', () => {
    const result = resolvePortalUrl('https://scraped-mirror.example.com', null);
    expect(result.hardFail).toBe(true);
  });

  it('hard-fails on a new scheme with no existing URL to fall back on', () => {
    const result = resolvePortalUrl('https://unverified.example.com', undefined);
    expect(result.hardFail).toBe(true);
    expect(result.url).toBe('https://unverified.example.com');
  });
});

describe('summarizeDiff', () => {
  const nextBase = {
    name: 'Test Scheme',
    benefitSummary: 'New benefit text',
    eligibilitySummaryPlain: 'New eligibility text',
    deadline: null as Date | null,
    status: 'open' as const,
    requiredDocuments: [{ label: 'Aadhaar', howToObtain: '', mandatory: true }],
    eligibilityRules: { incomeMax: 250000 },
    officialPortalUrl: 'https://pmkisan.gov.in',
    sourceRef: 'https://pmkisan.gov.in'
  };

  it('describes a brand new record as created, not a diff', () => {
    expect(summarizeDiff(null, nextBase)).toContain('New scheme record created');
  });

  it('reports no material change when nothing meaningful differs', () => {
    const previous = { ...nextBase };
    expect(summarizeDiff(previous, nextBase)).toContain('no material field changes');
  });

  it('reports a deadline change in a human-readable form', () => {
    const previous = { ...nextBase, deadline: new Date('2026-09-30') };
    const next = { ...nextBase, deadline: new Date('2026-12-31') };
    const summary = summarizeDiff(previous, next);
    expect(summary).toContain('deadline: 2026-09-30 → 2026-12-31');
  });

  it('reports a status change', () => {
    const previous = { ...nextBase, status: 'open' as const };
    const next = { ...nextBase, status: 'closed' as const };
    expect(summarizeDiff(previous, next)).toContain('status: open → closed');
  });

  it('reports a change in required document count', () => {
    const previous = { ...nextBase, requiredDocuments: [] };
    expect(summarizeDiff(previous, nextBase)).toContain('required documents: 0 → 1');
  });
});

describe('buildChangeReason', () => {
  it('cites the source-stated reason when the extraction provided one', () => {
    const reason = buildChangeReason(
      'benefit summary updated',
      'Gazette Notification No. 123/2026 dated 14 June 2026',
      'https://pmkisan.gov.in'
    );
    expect(reason).toContain('per Gazette Notification No. 123/2026');
    expect(reason).toContain('https://pmkisan.gov.in');
  });

  it('states plainly that no reason was given, rather than inventing one, when the source is silent', () => {
    const reason = buildChangeReason('benefit summary updated', null, 'https://pmkisan.gov.in');
    expect(reason).toContain('did not state an explicit reason');
    expect(reason).not.toMatch(/circular|notification|gazette/i);
  });

  it('treats a blank changeContext string the same as null', () => {
    const reason = buildChangeReason('benefit summary updated', '   ', 'https://pmkisan.gov.in');
    expect(reason).toContain('did not state an explicit reason');
  });
});

describe('computeCombinedScore', () => {
  it('returns 1 when both extraction confidence and source trust are maximal', () => {
    expect(computeCombinedScore(1, 100)).toBe(1);
  });

  it('returns 0 when both are minimal', () => {
    expect(computeCombinedScore(0, 0)).toBe(0);
  });

  it('a low-trust source pulls the combined score down even with a perfect extraction', () => {
    // 1.0 confidence but a 10/100-trust source (e.g. not on the gov allow-list)
    const score = computeCombinedScore(1, 10);
    expect(score).toBeLessThan(1);
    // Result is rounded to 2 decimal places, so compare at that precision.
    expect(score).toBeCloseTo(1 * 0.7 + 0.1 * 0.3, 2);
  });

  it('a highly-trusted source cannot rescue a poor extraction on its own', () => {
    // 0.3 confidence even from a 96/100-trust source
    const score = computeCombinedScore(0.3, 96);
    expect(score).toBeLessThan(0.75); // still below the default publish threshold
  });
});
