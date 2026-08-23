// See src/server.ts for why this is a side-effect import, not
// `import dotenv from 'dotenv'; dotenv.config();` ahead of other imports.
import 'dotenv/config';

import { connectDB, disconnectDB } from '../config/db.js';
import { runKnowledgeUpdate } from '../services/knowledge-update/pipeline.js';
import { logger } from '../utils/logger.js';

/**
 * The "Monitor" step's actual trigger (docs/prd.md §17.6 step 1 — "scheduled
 * jobs poll official government sources"). Run manually:
 *
 *   pnpm --filter @bharatassist/backend knowledge-update
 *
 * or on a real schedule via .github/workflows/knowledge-update.yml. Either
 * way this is the only entrypoint that runs the pipeline against the live
 * database — everything under services/knowledge-update/ is pure logic with
 * no side effects until this script calls it.
 */
const run = async () => {
  await connectDB();
  try {
    const summary = await runKnowledgeUpdate();

    const counts = summary.results.reduce<Record<string, number>>((acc, r) => {
      acc[r.outcome] = (acc[r.outcome] ?? 0) + 1;
      return acc;
    }, {});

    logger.info({ runAt: summary.runAt, counts, results: summary.results }, 'Knowledge Update run complete');

    const flagged = summary.results.filter((r) => r.outcome === 'flagged_for_review');
    if (flagged.length) {
      logger.info(
        { count: flagged.length },
        'Knowledge Update: items queued for review — see knowledgeUpdateLog for {action: "flagged_for_review", reviewedBy: null}'
      );
    }
  } finally {
    await disconnectDB();
  }
};

run().catch((err) => {
  logger.error({ err }, 'Knowledge Update run failed');
  process.exitCode = 1;
});
