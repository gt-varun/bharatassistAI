import mongoose, { Schema, Document } from 'mongoose';
import { ExtractionCorrection } from '@bharatassist/shared-types';

export interface ExtractionCorrectionDocument extends Omit<ExtractionCorrection, '_id'>, Document {}

const ExtractionCorrectionSchema = new Schema<ExtractionCorrectionDocument>(
  {
    logEntryId: { type: Schema.Types.ObjectId as any, ref: 'KnowledgeUpdateLog', required: true },
    schemeId: { type: Schema.Types.ObjectId as any, ref: 'Scheme', required: true, index: true },
    field: { type: String, required: true },
    aiValue: { type: Schema.Types.Mixed },
    correctedValue: { type: Schema.Types.Mixed },
    correctedBy: { type: String, required: true },
    note: { type: String },
    correctedAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: false }
);

export const ExtractionCorrectionModel = mongoose.model<ExtractionCorrectionDocument>(
  'ExtractionCorrection',
  ExtractionCorrectionSchema,
  'extractionCorrections'
);
