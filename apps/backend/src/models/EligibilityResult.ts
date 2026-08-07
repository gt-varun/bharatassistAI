import mongoose, { Schema, Document } from 'mongoose';
import { EligibilityResult } from '@bharatassist/shared-types';

export interface EligibilityResultDocument extends Omit<EligibilityResult, '_id'>, Document {}

const EligibilityResultSchema = new Schema<EligibilityResultDocument>(
  {
    userId: { type: Schema.Types.ObjectId as any, ref: 'User', required: true },
    schemeId: { type: Schema.Types.ObjectId as any, ref: 'Scheme', required: true },
    status: {
      type: String,
      enum: ['eligible', 'partially_eligible', 'not_eligible'],
      required: true
    },
    reasons: [{ type: String }],
    missingRequirements: [{ type: String }],
    alternativeSchemeIds: [{ type: Schema.Types.ObjectId as any, ref: 'Scheme' }],
    answeredAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: false }
);

EligibilityResultSchema.index({ userId: 1, schemeId: 1 }, { unique: true });

export const EligibilityResultModel = mongoose.model<EligibilityResultDocument>(
  'EligibilityResult',
  EligibilityResultSchema,
  'eligibilityResults'
);
