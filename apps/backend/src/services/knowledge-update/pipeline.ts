import { SchemeModel } from '../../models/Scheme.js';
import { SchemeEmbeddingModel } from '../../models/SchemeEmbedding.js';
import { SavedSchemeModel } from '../../models/SavedScheme.js';
import { KnowledgeUpdateLogModel } from '../../models/KnowledgeUpdateLog.js';
import { embed, schemeIndexText } from '../ai/embeddingProvider.js';
import { logger } from '../../utils/logger.js';
import { fetchSourceContent } from './fetcher.js';
import { hashContent, checkForChange, recordSnapshot } from './diffDetector.js';
import { extractSchemeFromText, type ExtractedScheme } from './extractor.js';
import { isValidGovDomain } from './govAllowlist.js';
import { KNOWLEDGE_UPDATE_SOURCES, type SourceConfig } from './sourceRegistry.js';
import { computeFieldChanges, SCHEME_UPDATABLE_FIELDS } from './fieldUpdater.js';
import { recordVersion } from './versioning.js';
import { recordFetchAttempt } from './sourceHealth.js';

/**
 * The full Knowledge Update System pipeline (docs/prd.md §17.6):
 * Monitor → Detect → Extract → Validate → Update knowledge base →
 * Regenerate embeddings → (search indexes are the same Mongo/vector indexes
 * every write already maintains, so there's no separate refresh step) →
 * Notify.
 *
 * This is the *only* place in the codebase that writes to `schemes` outside
 * of the seed script (docs/rules.md #15) — every citizen-facing module only
 * ever reads it.
 */

const CONFIDENCE_THRESHOLD = Number(process.env.KNOWLEDGE_UPDATE_CONFIDENCE_THRESHOLD ?? 0.75);

const TRUST_WEIGHT = 0.3;
const CONFIDENCE_WEIGHT = 1 - TRUST_WEIGHT;

/**
 * Confidence answers "did the model read this page correctly". Trust
 * answers "should we believe what this page says at all" — a question
 * about the source, not the extraction. They're blended into the single
 * number the publish decision actually gates on: a low-trust source can't
 * be rescued by a clean-looking extraction, and a highly-trusted source
 * still needs the extraction itself to be complete.
 */
export function computeCombinedScore(extractionConfidence: number, sourceTrustScore: number): number {
  const combined = extractionConfidence * CONFIDENCE_WEIGHT + (sourceTrustScore / 100) * TRUST_WEIGHT;
  return Math.round(combined * 100) / 100;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || 'scheme';
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await SchemeModel.exists({ slug: candidate })) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

/**
 * When a source page covers more than one register scheme (e.g. NSAP's
 * shared pension notification), match the extraction to whichever candidate
 * shares the most name tokens. Returns null rather than guessing when no
 * candidate is a clear winner — an ambiguous match should be reviewed, not
 * silently overwrite the wrong scheme.
 */
export function pickBestCandidate(extractedName: string, candidates: any[]): any | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const tokenize = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter(Boolean));
  const extractedTokens = tokenize(extractedName);

  const scored = candidates
    .map((candidate) => {
      const candidateTokens = tokenize(candidate.name);
      const overlap = [...extractedTokens].filter((t) => candidateTokens.has(t)).length;
      return { candidate, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap);

  const [best, runnerUp] = scored;
  if (best.overlap > 0 && best.overlap > (runnerUp?.overlap ?? 0)) return best.candidate;
  return null;
}

/**
 * Decides which URL is safe to publish as the official redirect target
 * (docs/rules.md #25 — never an unvalidated gov URL). Falling back to an
 * existing, already-trusted URL beats overwriting it with an unvalidated one
 * just because a re-extraction happened to omit it.
 */
export function resolvePortalUrl(
  extracted: string,
  existing?: string | null
): { url: string; hardFail: boolean } {
  if (isValidGovDomain(extracted)) return { url: extracted, hardFail: false };
  if (existing && isValidGovDomain(existing)) return { url: existing, hardFail: false };
  return { url: existing || extracted, hardFail: true };
}

function toSchemeUpdate(record: ExtractedScheme, portalUrl: string, sourceUrl: string, confidence: number) {
  return {
    name: record.name,
    department: record.department || 'Department not specified in source',
    level: record.level,
    state: record.level === 'central' ? null : record.state || null,
    shortDescription: record.shortDescription || record.name,
    fullDescription: record.fullDescription || record.shortDescription || record.name,
    targetSegments: record.targetSegments,
    benefitType: record.benefitType,
    benefitSummary: record.benefitSummary || record.shortDescription || record.name,
    eligibilityRules: record.eligibilityRules,
    eligibilitySummaryPlain: record.eligibilitySummaryPlain || record.shortDescription || record.name,
    requiredDocuments: record.requiredDocuments,
    applicationMode: record.applicationMode,
    officialPortalUrl: portalUrl,
    applicationFields: record.applicationFields,
    commonMistakes: record.commonMistakes,
    deadline: record.deadline ? new Date(record.deadline) : null,
    status: record.status,
    lastVerifiedAt: new Date(),
    sourceRef: sourceUrl,
    extractionConfidence: confidence
  };
}

/**
 * The subset of a scheme record `summarizeDiff` actually compares. Kept as
 * its own narrow type (rather than binding to `toSchemeUpdate`'s full
 * return shape) so the diffing logic is testable with small hand-built
 * fixtures instead of a fully-populated Scheme document.
 */
export interface SchemeDiffFields {
  benefitSummary: string;
  eligibilitySummaryPlain: string;
  deadline: Date | string | null;
  status: string;
  requiredDocuments: unknown[];
  eligibilityRules: unknown;
  officialPortalUrl: string;
  sourceRef: string;
}

/** Human-readable summary of what changed — the audit trail's whole point. */
export function summarizeDiff(previous: Partial<SchemeDiffFields> | null, next: SchemeDiffFields): string {
  if (!previous) return `New scheme record created from ${next.sourceRef}.`;

  const changes: string[] = [];
  if (previous.benefitSummary !== next.benefitSummary) changes.push('benefit summary updated');
  if (previous.eligibilitySummaryPlain !== next.eligibilitySummaryPlain) changes.push('eligibility summary updated');

  const fmt = (d: unknown) => (d ? new Date(d as any).toISOString().slice(0, 10) : 'none');
  const prevDeadline = fmt(previous.deadline);
  const nextDeadline = fmt(next.deadline);
  if (prevDeadline !== nextDeadline) changes.push(`deadline: ${prevDeadline} → ${nextDeadline}`);

  if (previous.status !== next.status) changes.push(`status: ${previous.status} → ${next.status}`);

  const prevDocs = previous.requiredDocuments?.length ?? 0;
  if (prevDocs !== next.requiredDocuments.length) {
    changes.push(`required documents: ${prevDocs} → ${next.requiredDocuments.length}`);
  }

  if (JSON.stringify(previous.eligibilityRules ?? {}) !== JSON.stringify(next.eligibilityRules)) {
    changes.push('eligibility rules changed');
  }
  if (previous.officialPortalUrl !== next.officialPortalUrl) changes.push('official portal URL changed');

  return changes.length ? changes.join('; ') : 'Re-verified — no material field changes detected.';
}

/**
 * Turns a diff into an explained *reason*, not just a description — grounded
 * exactly the way every other extracted fact is (docs/rules.md #16): use
 * `changeContext` when the source text actually stated one, otherwise say
 * plainly that none was stated. Never invent a circular number or a
 * plausible-sounding justification the source didn't give.
 */
export function buildChangeReason(
  diffSummary: string,
  changeContext: string | null | undefined,
  sourceUrl: string
): string {
  if (changeContext && changeContext.trim()) {
    return `${diffSummary} — per ${changeContext.trim()} (source: ${sourceUrl}).`;
  }
  return `${diffSummary} — detected during scheduled re-verification against ${sourceUrl}; the source did not state an explicit reason for the change.`;
}

export type SourceOutcome =
  | 'created'
  | 'updated'
  | 'flagged_for_review'
  | 'unchanged'
  | 'fetch_failed'
  | 'extraction_failed';

export interface KnowledgeUpdateSourceResult {
  sourceUrl: string;
  outcome: SourceOutcome;
  schemeSlug?: string;
  confidence?: number;
  combinedScore?: number;
  affectedSavedUsers?: number;
  reason?: string;
}

export interface KnowledgeUpdateRunSummary {
  runAt: Date;
  results: KnowledgeUpdateSourceResult[];
}

async function processSource(source: SourceConfig): Promise<KnowledgeUpdateSourceResult> {
  const fetchStart = Date.now();
  const fetched = await fetchSourceContent(source.url);
  const fetchMs = Date.now() - fetchStart;
  // Recorded regardless of outcome — source health tracking is independent
  // of the content-decision fields diffDetector.ts owns below.
  await recordFetchAttempt(source.url, { success: Boolean(fetched?.text), fetchMs });

  if (!fetched || !fetched.text) {
    // Transient — the snapshot is left untouched so this source is retried
    // (not treated as "reviewed and rejected") next run.
    return { sourceUrl: source.url, outcome: 'fetch_failed' };
  }

  const hash = hashContent(fetched.text);
  const { changed } = await checkForChange(source.url, hash);
  if (!changed) {
    return { sourceUrl: source.url, outcome: 'unchanged' };
  }

  const extraction = await extractSchemeFromText(fetched.text, source.url);
  if (!extraction) {
    await KnowledgeUpdateLogModel.create({
      schemeId: null,
      action: 'flagged_for_review',
      sourceUrl: source.url,
      extractionConfidence: 0,
      diffSummary: 'Extraction failed or returned no usable structured data.',
      changeReason: 'No structured extraction was produced, so there is nothing to explain a change with.',
      reviewedBy: null,
      runAt: new Date()
    });
    await recordSnapshot(source.url, source.schemeSlugs?.[0] ?? null, hash, 'flagged_for_review');
    return { sourceUrl: source.url, outcome: 'extraction_failed' };
  }

  const candidates = source.schemeSlugs?.length
    ? await SchemeModel.find({ slug: { $in: source.schemeSlugs } })
    : [];
  const matchedFromCandidates = pickBestCandidate(extraction.record.name, candidates);
  const existing =
    matchedFromCandidates ??
    (!source.schemeSlugs?.length
      ? await SchemeModel.findOne({ slug: slugify(extraction.record.name) })
      : null);

  const ambiguous = Boolean((source.schemeSlugs?.length ?? 0) > 1 && candidates.length > 1 && !existing);

  const { url: portalUrl, hardFail: portalHardFail } = resolvePortalUrl(
    extraction.record.officialPortalUrl,
    existing?.officialPortalUrl
  );

  const combinedScore = computeCombinedScore(extraction.confidence, source.trustScore);
  const publishable = !ambiguous && !portalHardFail && combinedScore >= CONFIDENCE_THRESHOLD;

  if (!publishable) {
    const reason = ambiguous
      ? 'Source page covers multiple register schemes and the extraction could not be matched to one confidently.'
      : portalHardFail
        ? 'Extracted official portal URL is not on the government-domain allow-list — refusing to auto-publish a redirect target.'
        : `Combined score ${combinedScore} (extraction confidence ${extraction.confidence}, source trust ${source.trustScore}/100) is below the ${CONFIDENCE_THRESHOLD} publish threshold.`;

    await KnowledgeUpdateLogModel.create({
      schemeId: existing?._id ?? null,
      action: 'flagged_for_review',
      sourceUrl: source.url,
      extractionConfidence: extraction.confidence,
      sourceTrustScore: source.trustScore,
      combinedScore,
      diffSummary: reason,
      changeReason: reason,
      reviewedBy: null,
      runAt: new Date()
    });
    await recordSnapshot(source.url, existing?.slug ?? source.schemeSlugs?.[0] ?? null, hash, 'flagged_for_review');

    return {
      sourceUrl: source.url,
      outcome: 'flagged_for_review',
      schemeSlug: existing?.slug,
      confidence: extraction.confidence,
      combinedScore,
      reason
    };
  }

  const update = toSchemeUpdate(extraction.record, portalUrl, source.url, extraction.confidence);
  const diffSummary = summarizeDiff(existing, update);
  const changeReason = buildChangeReason(diffSummary, extraction.record.changeContext, source.url);

  let schemeDoc: any;
  let action: 'created' | 'updated';
  let changedFields: string[];

  if (existing) {
    // Field-level write: only the individual top-level fields that actually
    // differ go into $set, and an empty extracted value never overwrites
    // real existing data (fieldUpdater.ts) — a deadline-only change on the
    // official page can never accidentally blank out a document list this
    // page's re-fetch simply didn't restate.
    const existingPlain = existing.toObject();
    const { changedFields: contentChanges, setPayload } = computeFieldChanges(existingPlain, update);
    changedFields = contentChanges;

    // Verification metadata updates on every successful re-check, whether
    // or not the content itself moved — "last verified" has to mean that.
    setPayload.lastVerifiedAt = update.lastVerifiedAt;
    setPayload.sourceRef = update.sourceRef;
    setPayload.extractionConfidence = update.extractionConfidence;

    schemeDoc = await SchemeModel.findByIdAndUpdate(existing._id, { $set: setPayload }, { new: true });
    action = 'updated';
  } else {
    const slug = await uniqueSlug(slugify(extraction.record.name));
    schemeDoc = await SchemeModel.create({ ...update, slug, translations: {} });
    action = 'created';
    changedFields = [...SCHEME_UPDATABLE_FIELDS];
  }

  await recordVersion(schemeDoc, changedFields, 'ai', diffSummary, changeReason, source.url);

  // Regenerate embeddings — same shape scripts/embed.ts uses at seed time,
  // so semantic search never serves a stale vector for a record this
  // pipeline just wrote. This *is* the "update search indexes" step: the
  // Mongo text/compound indexes are maintained automatically on write, and
  // the vector index is exactly this embeddings collection.
  try {
    const textChunk = schemeIndexText(schemeDoc);
    const embedding = await embed(textChunk);
    if (embedding.length && !embedding.every((v) => v === 0)) {
      await SchemeEmbeddingModel.findOneAndUpdate(
        { schemeId: schemeDoc._id },
        { schemeId: schemeDoc._id, embedding, textChunk, updatedAt: new Date() },
        { upsert: true }
      );
    }
  } catch (err) {
    logger.error({ err, slug: schemeDoc.slug }, 'Knowledge Update: re-embedding failed after publish');
  }

  await KnowledgeUpdateLogModel.create({
    schemeId: schemeDoc._id,
    action,
    sourceUrl: source.url,
    extractionConfidence: extraction.confidence,
    sourceTrustScore: source.trustScore,
    combinedScore,
    diffSummary,
    changeReason,
    reviewedBy: null,
    runAt: new Date()
  });
  await recordSnapshot(source.url, schemeDoc.slug, hash, action);

  // "Notify" (PRD §17.6 step 8): compute who is affected — real delivery
  // (email/SMS/push) is Notification-module infrastructure that doesn't
  // exist anywhere in this codebase yet (PRD §21 places it in V2). Building
  // a delivery channel here would mean inventing a second module's
  // foundation inside this one. What's real and ready today is this
  // computed, logged list — a real channel can read it the moment it exists.
  const affectedSavedUsers = await SavedSchemeModel.countDocuments({ schemeId: schemeDoc._id });
  if (affectedSavedUsers > 0) {
    logger.info(
      { schemeSlug: schemeDoc.slug, affectedSavedUsers, action },
      'Knowledge Update: citizens with this scheme saved would be notified here once a notification channel exists'
    );
  }

  return {
    sourceUrl: source.url,
    outcome: action,
    schemeSlug: schemeDoc.slug,
    confidence: extraction.confidence,
    combinedScore,
    affectedSavedUsers
  };
}

/** Runs the full pipeline over every configured source, one at a time. */
export async function runKnowledgeUpdate(
  sources: SourceConfig[] = KNOWLEDGE_UPDATE_SOURCES
): Promise<KnowledgeUpdateRunSummary> {
  const results: KnowledgeUpdateSourceResult[] = [];

  for (const source of sources) {
    try {
      // Sequential, not Promise.all: sources hit real third-party government
      // servers, and running them one at a time is a courteous, low-risk
      // default for a bot that isn't supposed to look like a burst of load.
      // eslint-disable-next-line no-await-in-loop
      const result = await processSource(source);
      results.push(result);
    } catch (err) {
      logger.error({ err, sourceUrl: source.url }, 'Knowledge Update: unhandled error processing source');
      results.push({ sourceUrl: source.url, outcome: 'fetch_failed', reason: 'Unhandled pipeline error' });
    }
  }

  return { runAt: new Date(), results };
}
