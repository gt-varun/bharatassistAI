import mongoose, { Schema, Document } from 'mongoose';
import { SourceSnapshot } from '@bharatassist/shared-types';

export interface SourceSnapshotDocument extends Omit<SourceSnapshot, '_id'>, Document {}

/**
 * See the interface doc comment in packages/shared-types — this is the
 * Knowledge Update System's own change-detection memory, not part of the
 * citizen-facing data model.
 */
const SourceSnapshotSchema = new Schema<SourceSnapshotDocument>(
  {
    sourceUrl: { type: String, required: true, unique: true, index: true },
    schemeSlug: { type: String, default: null },
    contentHash: { type: String, required: true },
    lastFetchedAt: { type: Date, required: true, default: Date.now },
    lastAction: {
      type: String,
      enum: ['created', 'updated', 'flagged_for_review', 'unchanged', 'fetch_failed'],
      required: true
    },
    // Source health — see services/knowledge-update/sourceHealth.ts.
    consecutiveFailures: { type: Number, default: 0 },
    lastSuccessAt: { type: Date, default: null },
    lastFetchMs: { type: Number, default: null },
    totalRuns: { type: Number, default: 0 },
    totalFailures: { type: Number, default: 0 }
  },
  { timestamps: false }
);

export const SourceSnapshotModel = mongoose.model<SourceSnapshotDocument>(
  'SourceSnapshot',
  SourceSnapshotSchema,
  'sourceSnapshots'
);
