import { KnowledgeUpdateLogModel } from '../../models/KnowledgeUpdateLog.js';

/**
 * The "lightweight internal review queue" PRD §17.6 step 4 allows for v1 —
 * deliberately just a query over `knowledgeUpdateLog`, not a table or admin
 * screen (docs/rules.md #28 — no admin CMS/CRUD dashboard in v1). There is
 * no HTTP route exposing this; it exists so a human reviewer can run it from
 * a script or REPL against the real database, and so a future reviewer
 * dashboard (PRD §20 future scope) has a function to call on day one instead
 * of writing this query again.
 */
export async function getPendingReview(limit = 50) {
  return KnowledgeUpdateLogModel.find({ action: 'flagged_for_review', reviewedBy: null })
    .sort({ runAt: -1 })
    .limit(limit)
    .lean();
}

/** Marks a queued entry as reviewed — approval/rejection of the underlying scheme write, if any, is a separate manual step. */
export async function markReviewed(logEntryId: string, reviewerName: string): Promise<void> {
  await KnowledgeUpdateLogModel.findByIdAndUpdate(logEntryId, { reviewedBy: reviewerName });
}
