import mongoose, { Schema, Document } from 'mongoose';
import { SavedScheme } from '@bharatassist/shared-types';

export interface SavedSchemeDocument extends Omit<SavedScheme, '_id'>, Document {}

const SavedSchemeSchema = new Schema<SavedSchemeDocument>(
  {
    userId: { type: Schema.Types.ObjectId as any, ref: 'User', required: true },
    schemeId: { type: Schema.Types.ObjectId as any, ref: 'Scheme', required: true },
    status: {
      type: String,
      enum: ['saved', 'eligibility_checked', 'application_in_progress', 'applied'],
      required: true,
      default: 'saved'
    },
    savedAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: false }
);

SavedSchemeSchema.index({ userId: 1, schemeId: 1 }, { unique: true });

export const SavedSchemeModel = mongoose.model<SavedSchemeDocument>(
  'SavedScheme',
  SavedSchemeSchema,
  'savedSchemes'
);
