import { SchemeModel } from '../../models/Scheme.js';
import { SchemeVersionModel } from '../../models/SchemeVersion.js';
import { logger } from '../../utils/logger.js';

/**
 * "Git for schemes" — every write to a `schemes` document gets an immutable
 * snapshot here, so the live record can answer "what changed, when, by
 * whom, and why", and a bad write is always recoverable.
 */

/** Records the current state of `schemeDoc` as the next version for that scheme. */
export async function recordVersion(
  schemeDoc: any,
  changedFields: string[],
  changedBy: 'ai' | 'manual' | 'rollback',
  diffSummary: string,
  changeReason: string,
  sourceRef: string | null
): Promise<void> {
  const last = await SchemeVersionModel.findOne({ schemeId: schemeDoc._id })
    .sort({ versionNumber: -1 })
    .lean();
  const versionNumber = (last?.versionNumber ?? 0) + 1;

  const snapshot = typeof schemeDoc.toObject === 'function' ? schemeDoc.toObject() : schemeDoc;

  await SchemeVersionModel.create({
    schemeId: schemeDoc._id,
    versionNumber,
    snapshot,
    changedFields,
    changedBy,
    diffSummary,
    changeReason,
    sourceRef,
    createdAt: new Date()
  });
}

/** Newest-first version history for one scheme — "PM-KISAN, version 4, 3, 2, 1". */
export async function getVersionHistory(schemeId: string, limit = 20) {
  return SchemeVersionModel.find({ schemeId }).sort({ versionNumber: -1 }).limit(limit).lean();
}

export interface RollbackResult {
  success: boolean;
  restoredVersion?: number;
  error?: string;
}

/**
 * Restores a scheme to exactly the state captured in one of its prior
 * versions, and records that restoration as a new version in its own right
 * — a rollback is a change too, and gets the same audit trail as any other.
 */
export async function rollbackToVersion(
  schemeId: string,
  versionNumber: number,
  performedBy: string
): Promise<RollbackResult> {
  const target = await SchemeVersionModel.findOne({ schemeId, versionNumber }).lean();
  if (!target) {
    return { success: false, error: `Version ${versionNumber} not found for scheme ${schemeId}.` };
  }

  const snapshot = target.snapshot as Record<string, any>;
  // Strip identity/bookkeeping fields — those belong to the live document,
  // not to what a version snapshot should overwrite.
  const { _id, __v, createdAt, updatedAt, ...restorable } = snapshot;

  const restored = await SchemeModel.findByIdAndUpdate(schemeId, { $set: restorable }, { new: true });
  if (!restored) {
    return { success: false, error: `Scheme ${schemeId} no longer exists.` };
  }

  await recordVersion(
    restored,
    Object.keys(restorable),
    'rollback',
    `Rolled back to version ${versionNumber}.`,
    `Manual rollback to version ${versionNumber}, performed by ${performedBy}.`,
    null
  );

  logger.info({ schemeId, versionNumber, performedBy }, 'Knowledge Update: scheme rolled back');
  return { success: true, restoredVersion: versionNumber };
}
