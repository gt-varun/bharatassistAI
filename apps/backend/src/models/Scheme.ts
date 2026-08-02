import mongoose, { Schema, Document } from 'mongoose';
import { Scheme } from '@bharatassist/shared-types';

export interface SchemeDocument extends Omit<Scheme, '_id'>, Document {}

const AdditionalConditionSchema = new Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ['equals', 'in', 'gte', 'lte', 'between', 'not_in'],
      required: true
    },
    value: { type: Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const EligibilityRulesSchema = new Schema(
  {
    state: [{ type: String }],
    ageMin: { type: Number, default: null },
    ageMax: { type: Number, default: null },
    incomeMax: { type: Number, default: null },
    occupationCategory: [{ type: String }],
    genderRestriction: { type: String, default: null },
    categoryRestriction: [{ type: String }],
    additionalConditions: [AdditionalConditionSchema]
  },
  { _id: false }
);

const RequiredDocumentSchema = new Schema(
  {
    label: { type: String, required: true },
    howToObtain: { type: String, required: true },
    mandatory: { type: Boolean, required: true }
  },
  { _id: false }
);

const ApplicationFieldSchema = new Schema(
  {
    fieldName: { type: String, required: true },
    instructions: { type: String, required: true },
    mandatory: { type: Boolean, required: true }
  },
  { _id: false }
);

const SchemeTranslationSchema = new Schema(
  {
    name: { type: String },
    shortDescription: { type: String },
    eligibilitySummaryPlain: { type: String },
    verified: { type: Boolean, required: true, default: false }
  },
  { _id: false }
);

const SchemeSchema = new Schema<SchemeDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    department: { type: String, required: true },
    level: { type: String, enum: ['central', 'state'], required: true },
    state: { type: String, default: null },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    targetSegments: [{ type: String, required: true }],
    benefitType: {
      type: String,
      enum: ['cash', 'loan', 'subsidy', 'certificate', 'service'],
      required: true
    },
    benefitSummary: { type: String, required: true },
    eligibilityRules: { type: EligibilityRulesSchema, required: true },
    eligibilitySummaryPlain: { type: String, required: true },
    requiredDocuments: [RequiredDocumentSchema],
    applicationMode: { type: String, enum: ['online', 'offline', 'both'], required: true },
    officialPortalUrl: { type: String, required: true },
    applicationFields: [ApplicationFieldSchema],
    commonMistakes: [{ type: String }],
    deadline: { type: Date, default: null },
    status: { type: String, enum: ['open', 'closed', 'rolling'], required: true },
    translations: { type: Map, of: SchemeTranslationSchema, default: {} },
    lastVerifiedAt: { type: Date, required: true, default: Date.now, index: true },
    sourceRef: { type: String, required: true },
    extractionConfidence: { type: Number, default: null }
  },
  { timestamps: true }
);

// Indexes per docs/scheme-database.md
SchemeSchema.index({ targetSegments: 1, state: 1, status: 1 });
SchemeSchema.index({ name: 'text', shortDescription: 'text', fullDescription: 'text' });

export const SchemeModel = mongoose.model<SchemeDocument>('Scheme', SchemeSchema, 'schemes');
