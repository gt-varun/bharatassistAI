// See src/server.ts for why this is a side-effect import, not
// `import dotenv from 'dotenv'; dotenv.config();` ahead of other imports.
import 'dotenv/config';

import { connectDB, disconnectDB } from '../config/db.js';
import { getSchemeBySlugOrId } from '../services/ai/retrievalService.js';
import { getVersionHistory, rollbackToVersion } from '../services/knowledge-update/versioning.js';
import { logger } from '../utils/logger.js';

/**
 * Rolls a scheme back to a prior version. No admin UI exists for this in v1
 * (docs/rules.md #28), but the capability is real, not aspirational:
 *
 *   pnpm --filter @bharatassist/backend rollback-scheme -- <slug-or-id> <versionNumber> <performedBy>
 *   pnpm --filter @bharatassist/backend rollback-scheme -- pm-kisan-samman-nidhi   # lists history, no rollback
 */
const run = async () => {
  const [idOrSlug, versionArg, performedBy] = process.argv.slice(2);

  if (!idOrSlug) {
    logger.error('Usage: rollback-scheme <slug-or-id> [versionNumber] [performedBy]');
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

    if (!versionArg) {
      const history = await getVersionHistory(scheme._id);
      logger.info(
        { scheme: scheme.name, versions: history.map((v) => ({ versionNumber: v.versionNumber, changedBy: v.changedBy, changedFields: v.changedFields, diffSummary: v.diffSummary, createdAt: v.createdAt })) },
        'Version history (pass a version number as the second argument to roll back)'
      );
      return;
    }

    const versionNumber = Number(versionArg);
    if (!Number.isFinite(versionNumber)) {
      logger.error({ versionArg }, 'versionNumber must be a number');
      process.exitCode = 1;
      return;
    }

    const result = await rollbackToVersion(scheme._id, versionNumber, performedBy || 'unspecified-operator');
    if (!result.success) {
      logger.error({ result }, 'Rollback failed');
      process.exitCode = 1;
      return;
    }

    logger.info({ scheme: scheme.name, restoredVersion: result.restoredVersion }, 'Rollback complete');
  } finally {
    await disconnectDB();
  }
};

run().catch((err) => {
  logger.error({ err }, 'rollback-scheme failed');
  process.exitCode = 1;
});
