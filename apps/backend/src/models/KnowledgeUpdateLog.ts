import mongoose, { Schema, Document } from 'mongoose';
import { KnowledgeUpdateLogEntry } from '@bharatassist/shared-types';

export interface KnowledgeUpdateLogDocument extends Omit<KnowledgeUpdateLogEntry, '_id'>, Document {}

const KnowledgeUpdateLogSchema = new Schema<KnowledgeUpdateLogDocument>(
  {
    schemeId: { type: Schema.Types.ObjectId as any, ref: 'Scheme', default: null },
    action: {
      type: String,
      enum: ['created', 'updated', 'flagged_for_review'],
      required: true
    },
    sourceUrl: { type: String, required: true },
    extractionConfidence: { type: Number, required: true },
    diffSummary: { type: String, required: true },
    reviewedBy: { type: String, default: null },
    runAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: false }
);

KnowledgeUpdateLogSchema.index({ schemeId: 1, runAt: -1 });
KnowledgeUpdateLogSchema.index({ action: 1, reviewedBy: 1 });

export const KnowledgeUpdateLogModel = mongoose.model<KnowledgeUpdateLogDocument>(
  'KnowledgeUpdateLog',
  KnowledgeUpdateLogSchema,
  'knowledgeUpdateLog'
);
