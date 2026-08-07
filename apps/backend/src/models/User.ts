import mongoose, { Schema, Document } from 'mongoose';
import { User } from '@bharatassist/shared-types';

export interface UserDocument extends Omit<User, '_id'>, Document {
  refreshTokenVersion: number;
  /** SHA-256 of the reset token — the plaintext only ever leaves in the message. */
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
}

const UserSchema = new Schema<UserDocument>(
  {
    phone: { type: String, default: null, sparse: true, unique: true },
    email: { type: String, default: null, sparse: true, unique: true },
    passwordHash: { type: String, default: null },
    preferredLanguage: { type: String, required: true, default: 'en' },
    refreshTokenVersion: { type: Number, required: true, default: 0 },
    notificationsEnabled: { type: Boolean, required: true, default: true },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

/**
 * Auth responses send the user document straight back to the browser, so the
 * secrets are stripped here rather than at each call site — one place to get
 * right, and impossible to forget on a route added later.
 */
UserSchema.set('toJSON', {
  transform: (_doc, doc) => {
    const ret = doc as unknown as Record<string, unknown>;
    delete ret.passwordHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    return ret;
  }
});

export const UserModel = mongoose.model<UserDocument>('User', UserSchema, 'users');
