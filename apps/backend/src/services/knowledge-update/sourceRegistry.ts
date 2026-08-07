/**
 * The "Monitor" step's watch list (docs/prd.md §17.6 step 1).
 *
 * Each entry is a real official source the pipeline fetches on every run.
 * `schemeSlugs` names which existing register entries this source is
 * expected to keep current — most sources map to exactly one scheme.
 * Two schemes occasionally share one notification page (e.g. both NSAP
 * pension sub-schemes), so it's a list rather than a single slug; the
 * extractor picks the best match by name overlap and flags the source for
 * review rather than guessing if it can't tell them apart.
 *
 * An entry with no `schemeSlugs` is a "new scheme candidate" source: if
 * extraction succeeds and nothing in the register matches the extracted
 * name, the pipeline creates a new scheme rather than updating one.
 *
 * `trustScore` (0–100) answers a different question than extraction
 * confidence: not "did the model read this page correctly" but "should we
 * trust what this page says at all". A dedicated ministry portal earns a
 * high score; a source that isn't even on the gov-domain allow-list earns a
 * low one regardless of how cleanly it happens to parse. `pipeline.ts`
 * blends the two into the actual publish decision.
 *
 * This list is intentionally short and hand-curated for v1 — PRD §17.6
 * describes the conceptual pipeline; sourcing a comprehensive, continuously
 * updated feed of every central/state notification is real content-ops work
 * beyond what one watch-list file can responsibly claim to do. Extend this
 * list as more sources are identified; nothing else in the pipeline changes.
 */
export interface SourceConfig {
  url: string;
  /** Existing register entries this page is expected to keep current, if any. */
  schemeSlugs?: string[];
  /** How much this source is trusted a priori, independent of extraction quality. 0–100. */
  trustScore: number;
  /** Free-text note on why this source is watched — shown in logs only. */
  note?: string;
}

export const KNOWLEDGE_UPDATE_SOURCES: SourceConfig[] = [
  { url: 'https://pmkisan.gov.in', schemeSlugs: ['pm-kisan-samman-nidhi'], trustScore: 96 },
  { url: 'https://pmfby.gov.in', schemeSlugs: ['pm-fasal-bima-yojana'], trustScore: 96 },
  { url: 'https://pmmvy.wcd.gov.in', schemeSlugs: ['pm-matru-vandana-yojana'], trustScore: 94 },
  { url: 'https://www.pmuy.gov.in', schemeSlugs: ['pm-ujjwala-yojana'], trustScore: 96 },
  { url: 'https://beneficiary.nha.gov.in', schemeSlugs: ['ayushman-bharat-pmjay'], trustScore: 94 },
  { url: 'https://pmayg.nic.in', schemeSlugs: ['pm-awas-yojana-gramin'], trustScore: 92 },
  {
    url: 'https://www.mudra.org.in',
    schemeSlugs: ['pm-mudra-yojana'],
    trustScore: 85,
    note: 'Government-promoted but .org.in rather than .gov.in — scored slightly below a direct ministry domain.'
  },
  { url: 'https://pmvishwakarma.gov.in', schemeSlugs: ['pm-vishwakarma'], trustScore: 96 },
  { url: 'https://www.kviconline.gov.in/pmegpeportal', schemeSlugs: ['pmegp'], trustScore: 90 },
  { url: 'https://www.skillindiadigital.gov.in', schemeSlugs: ['pmkvy-skill-training'], trustScore: 90 },
  {
    url: 'https://nsap.nic.in',
    schemeSlugs: ['ignwps-widow-pension', 'ignoaps-senior-citizen-pension'],
    trustScore: 88,
    note: 'One notification page covers both NSAP pension sub-schemes — the extractor must disambiguate. Scored slightly below a single-scheme portal for that ambiguity risk.'
  },
  {
    url: 'https://www.standupmitra.in',
    schemeSlugs: ['stand-up-india'],
    trustScore: 15,
    note: 'Not on the gov-domain allow-list — a deliberately-included case that should route to review, not auto-publish, regardless of how well it parses.'
  }
];
