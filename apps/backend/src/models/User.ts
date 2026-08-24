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
    // Uniqueness is declared as a partial index below, not here — see why.
    phone: { type: String, default: null },
    email: { type: String, default: null },
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
 * A citizen has a phone or an email, rarely both, so the unused one is
 * stored as `null` — and a `sparse` unique index does not cover that.
 *
 * Sparse omits only documents where the field is *absent*; a field that is
 * present and null is indexed like any other value. With `default: null` on
 * both fields, the first phone sign-up wrote `email: null` and the second
 * collided with it:
 *
 *   E11000 duplicate key error … index: email_1 dup key: { email: null }
 *
 * so exactly one citizen could ever register by phone, and one by email. A
 * partial index fixes it properly by indexing only real values: any number
 * of accounts may leave the other field empty, while genuine duplicates are
 * still refused.
 *
 * Index options are not updated on an index that already exists, so run
 * `pnpm sync-indexes` once against a database created before this change.
 */
UserSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
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
    delete ret.refreshTokenVersion;
    return ret;
  }
});

export const UserModel = mongoose.model<UserDocument>('User', UserSchema, 'users');
