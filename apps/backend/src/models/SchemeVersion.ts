import mongoose, { Schema, Document } from 'mongoose';
import { SchemeVersion } from '@bharatassist/shared-types';

export interface SchemeVersionDocument extends Omit<SchemeVersion, '_id'>, Document {}

const SchemeVersionSchema = new Schema<SchemeVersionDocument>(
  {
    schemeId: { type: Schema.Types.ObjectId as any, ref: 'Scheme', required: true, index: true },
    versionNumber: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    changedFields: [{ type: String }],
    changedBy: { type: String, enum: ['ai', 'manual', 'rollback'], required: true },
    diffSummary: { type: String, required: true },
    changeReason: { type: String, required: true },
    sourceRef: { type: String, default: null },
    createdAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: false }
);

// One version number per scheme, never reused — this is what makes "roll
// back scheme X to version 3" an unambiguous operation.
SchemeVersionSchema.index({ schemeId: 1, versionNumber: -1 }, { unique: true });

export const SchemeVersionModel = mongoose.model<SchemeVersionDocument>(
  'SchemeVersion',
  SchemeVersionSchema,
  'schemeVersions'
);
