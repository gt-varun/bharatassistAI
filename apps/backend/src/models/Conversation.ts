import mongoose, { Schema, Document } from 'mongoose';
import { Conversation } from '@bharatassist/shared-types';

export interface ConversationDocument extends Omit<Conversation, '_id'>, Document {}

const ConversationMessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    sourceSchemeIds: [{ type: Schema.Types.ObjectId as any, ref: 'Scheme' }]
  },
  { _id: false }
);

const ConversationSchema = new Schema<ConversationDocument>(
  {
    userId: { type: Schema.Types.ObjectId as any, ref: 'User', default: null },
    messages: [ConversationMessageSchema],
    language: { type: String, required: true, default: 'en' }
  },
  { timestamps: true }
);

ConversationSchema.index({ userId: 1, updatedAt: -1 });

export const ConversationModel = mongoose.model<ConversationDocument>(
  'Conversation',
  ConversationSchema,
  'conversations'
);
