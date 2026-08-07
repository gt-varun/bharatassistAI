import mongoose, { Schema, Document } from 'mongoose';
import { CitizenProfile } from '@bharatassist/shared-types';

export interface CitizenProfileDocument extends Omit<CitizenProfile, '_id'>, Document {}

const CitizenProfileSchema = new Schema<CitizenProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId as any, ref: 'User', required: true, unique: true, index: true },
    state: { type: String, required: true },
    district: { type: String, default: null },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    occupationCategory: { type: String, default: null },
    incomeBand: { type: String, default: null },
    educationLevel: { type: String, default: null },
    category: { type: String, default: null },
    disabilityStatus: { type: Boolean, default: null },
    maritalStatus: { type: String, default: null },
    landOwnershipAcres: { type: Number, default: null },
    businessType: { type: String, default: null }
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const CitizenProfileModel = mongoose.model<CitizenProfileDocument>(
  'CitizenProfile',
  CitizenProfileSchema,
  'citizenProfiles'
);
