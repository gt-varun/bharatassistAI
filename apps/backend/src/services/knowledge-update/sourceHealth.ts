import { SourceSnapshotModel } from '../../models/SourceSnapshot.js';

/**
 * Internal source-health metrics — not a dashboard, just numbers a reviewer
 * or a future alerting job can query. Recorded on every fetch attempt,
 * independent of the content-decision fields (`contentHash`/`lastAction`)
 * that `diffDetector.ts` owns, so a run of failures doesn't get mistaken
 * for "reviewed and settled".
 */

export interface FetchAttemptOutcome {
  success: boolean;
  fetchMs: number;
}

/** Records one fetch attempt's outcome against the running per-source counters. */
export async function recordFetchAttempt(sourceUrl: string, outcome: FetchAttemptOutcome): Promise<void> {
  const existing = await SourceSnapshotModel.findOne({ sourceUrl }).lean();

  const totalRuns = (existing?.totalRuns ?? 0) + 1;
  const totalFailures = (existing?.totalFailures ?? 0) + (outcome.success ? 0 : 1);
  const consecutiveFailures = outcome.success ? 0 : (existing?.consecutiveFailures ?? 0) + 1;

  await SourceSnapshotModel.findOneAndUpdate(
    { sourceUrl },
    {
      $set: {
        lastFetchMs: outcome.fetchMs,
        consecutiveFailures,
        totalRuns,
        totalFailures,
        ...(outcome.success ? { lastSuccessAt: new Date() } : {})
      },
      $setOnInsert: {
        sourceUrl,
        contentHash: '',
        lastAction: 'fetch_failed',
        lastFetchedAt: new Date()
      }
    },
    { upsert: true }
  );
}

export interface SourceHealthReport {
  sourceUrl: string;
  successRate: number;
  consecutiveFailures: number;
  lastSuccessAt: Date | null;
  lastFetchMs: number | null;
  totalRuns: number;
}

/** Pure — turns one raw snapshot row into a health report entry. Exported for testing. */
export function toHealthReport(row: {
  sourceUrl: string;
  totalRuns?: number;
  totalFailures?: number;
  consecutiveFailures?: number;
  lastSuccessAt?: Date | string | null;
  lastFetchMs?: number | null;
}): SourceHealthReport {
  const totalRuns = row.totalRuns ?? 0;
  const totalFailures = row.totalFailures ?? 0;
  return {
    sourceUrl: row.sourceUrl,
    // A source with no runs yet hasn't failed anything — 100%, not 0%,
    // avoids a brand-new source reading as "unhealthy" before its first run.
    successRate: totalRuns === 0 ? 1 : Math.round(((totalRuns - totalFailures) / totalRuns) * 100) / 100,
    consecutiveFailures: row.consecutiveFailures ?? 0,
    lastSuccessAt: row.lastSuccessAt ? new Date(row.lastSuccessAt) : null,
    lastFetchMs: row.lastFetchMs ?? null,
    totalRuns
  };
}

/** Worst-health-first report across every monitored source. */
export async function getSourceHealthReport(): Promise<SourceHealthReport[]> {
  const rows = await SourceSnapshotModel.find({}).lean();
  return rows.map(toHealthReport).sort((a, b) => a.successRate - b.successRate || b.consecutiveFailures - a.consecutiveFailures);
}
