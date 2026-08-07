import mongoose, { Schema, Document } from 'mongoose';
import { DocumentChecklist } from '@bharatassist/shared-types';

export interface DocumentChecklistDocument extends Omit<DocumentChecklist, '_id'>, Document {}

const DocumentChecklistItemSchema = new Schema(
  {
    label: { type: String, required: true },
    status: { type: String, enum: ['have', 'missing', 'required'], required: true },
    howToObtain: { type: String, required: true }
  },
  { _id: false }
);

const DocumentChecklistSchema = new Schema<DocumentChecklistDocument>(
  {
    userId: { type: Schema.Types.ObjectId as any, ref: 'User', required: true },
    schemeId: { type: Schema.Types.ObjectId as any, ref: 'Scheme', required: true },
    items: [DocumentChecklistItemSchema]
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

DocumentChecklistSchema.index({ userId: 1, schemeId: 1 }, { unique: true });

export const DocumentChecklistModel = mongoose.model<DocumentChecklistDocument>(
  'DocumentChecklist',
  DocumentChecklistSchema,
  'documentChecklists'
);
