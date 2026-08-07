import { SchemeModel } from '../../models/Scheme.js';
import { ExtractionCorrectionModel } from '../../models/ExtractionCorrection.js';
import { recordVersion } from './versioning.js';
import { logger } from '../../utils/logger.js';

/**
 * The human-feedback loop: AI extracted → reviewer corrected → correction
 * stored. No admin UI ships this correction in v1 (docs/rules.md #28), but
 * the capability is real — a reviewer working from the review queue
 * (`reviewQueue.ts`) can invoke this today via
 * `pnpm --filter backend record-correction`, and every correction is kept
 * as its own record specifically so a later prompt-tuning or model-eval
 * pass has real labelled data to learn from, not something bolted on after
 * the fact.
 */

export interface CorrectionInput {
  logEntryId: string;
  schemeId: string;
  field: string;
  aiValue: unknown;
  correctedValue: unknown;
  correctedBy: string;
  note?: string;
}

/**
 * Stores the correction and applies it to the live scheme record — a
 * correction that never reaches the citizen-facing document is a note
 * nobody reads, not a fix.
 */
export async function recordCorrection(input: CorrectionInput): Promise<void> {
  await ExtractionCorrectionModel.create({ ...input, correctedAt: new Date() });

  const updated = await SchemeModel.findByIdAndUpdate(
    input.schemeId,
    { $set: { [input.field]: input.correctedValue } },
    { new: true }
  );

  if (!updated) {
    logger.warn(
      { schemeId: input.schemeId, field: input.field },
      'Knowledge Update: correction recorded but the target scheme no longer exists'
    );
    return;
  }

  await recordVersion(
    updated,
    [input.field],
    'manual',
    `Field "${input.field}" corrected by a human reviewer.`,
    input.note?.trim() || `Reviewer ${input.correctedBy} corrected an AI extraction error.`,
    null
  );
}

/** Recent corrections — the raw material for prompt tuning or model evaluation, not built here. */
export async function getCorrectionsForEvaluation(limit = 100) {
  return ExtractionCorrectionModel.find({}).sort({ correctedAt: -1 }).limit(limit).lean();
}
