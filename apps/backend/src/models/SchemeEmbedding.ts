import mongoose, { Schema, Document } from 'mongoose';
import { SchemeEmbedding } from '@bharatassist/shared-types';

export interface SchemeEmbeddingDocument extends Omit<SchemeEmbedding, '_id'>, Document {}

const SchemeEmbeddingSchema = new Schema<SchemeEmbeddingDocument>(
  {
    schemeId: { type: Schema.Types.ObjectId as any, ref: 'Scheme', required: true, unique: true, index: true },
    embedding: { type: [Number], required: true },
    textChunk: { type: String, required: true },
    updatedAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: false }
);

export const SchemeEmbeddingModel = mongoose.model<SchemeEmbeddingDocument>(
  'SchemeEmbedding',
  SchemeEmbeddingSchema,
  'schemeEmbeddings'
);
