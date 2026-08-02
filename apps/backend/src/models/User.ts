import mongoose, { Schema, Document } from 'mongoose';
import { User } from '@bharatassist/shared-types';

export interface UserDocument extends Omit<User, '_id'>, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    phone: { type: String, default: null, sparse: true, unique: true },
    email: { type: String, default: null, sparse: true, unique: true },
    passwordHash: { type: String, default: null },
    preferredLanguage: { type: String, required: true, default: 'en' },
    refreshTokenVersion: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<UserDocument>('User', UserSchema, 'users');
