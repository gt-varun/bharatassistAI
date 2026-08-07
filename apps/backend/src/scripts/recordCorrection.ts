// See src/server.ts for why this is a side-effect import, not
// `import dotenv from 'dotenv'; dotenv.config();` ahead of other imports.
import 'dotenv/config';

import { connectDB, disconnectDB } from '../config/db.js';
import { getSchemeBySlugOrId } from '../services/ai/retrievalService.js';
import { recordCorrection } from '../services/knowledge-update/corrections.js';
import { logger } from '../utils/logger.js';

/**
 * Records a human reviewer's correction to an AI extraction — the
 * human-feedback loop's real entrypoint, standing in for the admin UI this
 * project deliberately doesn't ship in v1 (docs/rules.md #28). A reviewer
 * working from the review queue (`getPendingReview` in reviewQueue.ts) runs:
 *
 *   pnpm --filter @bharatassist/backend record-correction -- \
 *     <knowledgeUpdateLog _id> <scheme-slug-or-id> <field> '<correctedValueAsJSON>' <reviewerName> [note...]
 *
 * Example:
 *   pnpm --filter @bharatassist/backend record-correction -- \
 *     665f... pm-kisan-samman-nidhi benefitSummary '"₹6,000 per year in three instalments"' priya.reviewer
 */
const run = async () => {
  const [logEntryId, idOrSlug, field, correctedValueRaw, correctedBy, ...noteParts] = process.argv.slice(2);

  if (!logEntryId || !idOrSlug || !field || correctedValueRaw === undefined || !correctedBy) {
    logger.error(
      'Usage: record-correction <logEntryId> <slug-or-id> <field> <correctedValueAsJSON> <correctedBy> [note...]'
    );
    process.exitCode = 1;
    return;
  }

  await connectDB();
  try {
    const scheme = await getSchemeBySlugOrId(idOrSlug);
    if (!scheme || !scheme._id) {
      logger.error({ idOrSlug }, 'No scheme found for that slug or id');
      process.exitCode = 1;
      return;
    }

    let correctedValue: unknown;
    try {
      correctedValue = JSON.parse(correctedValueRaw);
    } catch {
      // A bare unquoted string on the command line — accept it as-is
      // rather than forcing the operator to remember to quote it as JSON.
      correctedValue = correctedValueRaw;
    }

    const aiValue = (scheme as unknown as Record<string, unknown>)[field];

    await recordCorrection({
      logEntryId,
      schemeId: scheme._id,
      field,
      aiValue,
      correctedValue,
      correctedBy,
      note: noteParts.length ? noteParts.join(' ') : undefined
    });

    logger.info({ scheme: scheme.name, field, aiValue, correctedValue }, 'Correction recorded and applied');
  } finally {
    await disconnectDB();
  }
};

run().catch((err) => {
  logger.error({ err }, 'record-correction failed');
  process.exitCode = 1;
});
