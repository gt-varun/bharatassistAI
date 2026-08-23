import { createHash } from 'node:crypto';
import { SourceSnapshotModel } from '../../models/SourceSnapshot.js';

/** Stable content hash, so a whitespace-only re-fetch never reads as a change. */
export function hashContent(text: string): string {
  return createHash('sha256').update(text.trim()).digest('hex');
}

export interface SnapshotCheck {
  changed: boolean;
  previousHash: string | null;
}

/**
 * The "Detect" step (docs/prd.md §17.6 step 2): has this source's content
 * changed since the last run? A source with no prior snapshot always counts
 * as changed — there is nothing to diff against yet.
 */
export async function checkForChange(sourceUrl: string, newHash: string): Promise<SnapshotCheck> {
  const previous = await SourceSnapshotModel.findOne({ sourceUrl }).lean();
  if (!previous) return { changed: true, previousHash: null };
  return { changed: previous.contentHash !== newHash, previousHash: previous.contentHash };
}

/** Records this run's outcome so the next run can tell "unchanged" from "worth re-checking". */
export async function recordSnapshot(
  sourceUrl: string,
  schemeSlug: string | null,
  contentHash: string,
  lastAction: 'created' | 'updated' | 'flagged_for_review' | 'unchanged' | 'fetch_failed'
): Promise<void> {
  await SourceSnapshotModel.findOneAndUpdate(
    { sourceUrl },
    { sourceUrl, schemeSlug, contentHash, lastFetchedAt: new Date(), lastAction },
    { upsert: true }
  );
}
