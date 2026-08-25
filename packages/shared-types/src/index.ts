export interface AdditionalCondition {
  field: string;
  operator: 'equals' | 'in' | 'gte' | 'lte' | 'between' | 'not_in';
  value: any;
}

export interface EligibilityRules {
  state?: string[];
  ageMin?: number | null;
  ageMax?: number | null;
  incomeMax?: number | null;
  occupationCategory?: string[];
  genderRestriction?: string | null;
  categoryRestriction?: string[];
  additionalConditions?: AdditionalCondition[];
}

export interface RequiredDocument {
  label: string;
  howToObtain: string;
  mandatory: boolean;
}

export interface ApplicationField {
  fieldName: string;
  instructions: string;
  mandatory: boolean;
}

export interface SchemeTranslation {
  name?: string;
  shortDescription?: string;
  eligibilitySummaryPlain?: string;
  verified: boolean;
}

export interface Scheme {
  _id?: string;
  name: string;
  slug: string;
  department: string;
  level: 'central' | 'state';
  state: string | null;
  shortDescription: string;
  fullDescription: string;
  targetSegments: string[];
  benefitType: 'cash' | 'loan' | 'subsidy' | 'certificate' | 'service';
  benefitSummary: string;
  eligibilityRules: EligibilityRules;
  eligibilitySummaryPlain: string;
  requiredDocuments: RequiredDocument[];
  applicationMode: 'online' | 'offline' | 'both';
  officialPortalUrl: string;
  applicationFields: ApplicationField[];
  commonMistakes: string[];
  deadline: string | Date | null;
  status: 'open' | 'closed' | 'rolling';
  translations: Record<string, SchemeTranslation>;
  lastVerifiedAt: string | Date;
  sourceRef: string;
  extractionConfidence: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface User {
  _id?: string;
  phone: string | null;
  email: string | null;
  passwordHash: string | null;
  preferredLanguage: string;
  refreshTokenVersion: number;
  /** Deadline reminders and scheme updates. Opt-out, not opt-in. */
  notificationsEnabled?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CitizenProfile {
  _id?: string;
  userId: string;
  /**
   * What the citizen would like to be called. It takes no part in
   * eligibility or scoring — it exists so the app can address someone by
   * name rather than as an account — and like every field except `currentState`
   * it is optional.
   */
  fullName?: string | null;
  currentState: string;
  /** Backward-compatible alias for currentState */
  state?: string;
  district?: string | null;
  age?: number | null;
  gender?: string | null;
  occupationCategory?: string | null;
  incomeBand?: string | null;
  educationLevel?: string | null;
  category?: string | null;
  disabilityStatus?: boolean | null;
  maritalStatus?: string | null;
  landOwnershipAcres?: number | null;
  businessType?: string | null;
  updatedAt?: string | Date;
}

export interface EligibilityResult {
  _id?: string;
  userId: string;
  schemeId: string;
  status: 'eligible' | 'partially_eligible' | 'not_eligible';
  reasons: string[];
  missingRequirements: string[];
  alternativeSchemeIds: string[];
  answeredAt: string | Date;
}

export interface DocumentChecklistItem {
  label: string;
  status: 'have' | 'missing' | 'required';
  howToObtain: string;
}

export interface DocumentChecklist {
  _id?: string;
  userId: string;
  schemeId: string;
  items: DocumentChecklistItem[];
  updatedAt: string | Date;
}

export interface SavedScheme {
  _id?: string;
  userId: string;
  schemeId: string;
  status: 'saved' | 'eligibility_checked' | 'application_in_progress' | 'applied';
  savedAt: string | Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date;
  sourceSchemeIds?: string[];
}

export interface Conversation {
  _id?: string;
  userId: string | null;
  messages: ConversationMessage[];
  language: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface KnowledgeUpdateLogEntry {
  _id?: string;
  schemeId: string | null;
  action: 'created' | 'updated' | 'flagged_for_review';
  sourceUrl: string;
  extractionConfidence: number;
  diffSummary: string;
  reviewedBy: string | null;
  runAt: string | Date;
  /**
   * Optional, additive field. Grounded in the source text when it states one
   * (e.g. a circular reference); otherwise an honest "no reason stated"
   * note — never an invented explanation (docs/rules.md #16).
   */
  changeReason?: string;
  /** How much this source is trusted a priori (docs/prd.md §17.6 — distinct from extraction quality). 0–100. */
  sourceTrustScore?: number;
  /** The weighted blend of extraction confidence and source trust that the publish decision actually gated on. 0–1. */
  combinedScore?: number;
}

/**
 * One immutable snapshot per write to a `schemes` document — "git for
 * schemes". `schemes` itself always holds only the current state; the full
 * history, the ability to answer "what changed and why", and rollback all
 * live here instead.
 */
export interface SchemeVersion {
  _id?: string;
  schemeId: string;
  /** 1, 2, 3... per scheme — the version this snapshot represents. */
  versionNumber: number;
  /** The full scheme document as it stood immediately after this write. */
  snapshot: Record<string, any>;
  /** Which top-level Scheme fields actually changed in this write. */
  changedFields: string[];
  changedBy: 'ai' | 'manual' | 'rollback';
  diffSummary: string;
  changeReason: string;
  /** Null for a rollback — a rollback's source is a prior version, not a URL. */
  sourceRef: string | null;
  createdAt: string | Date;
}

/**
 * The human-feedback loop: what the AI extracted vs. what a reviewer
 * corrected it to, per field. Feeds two things this v1 doesn't build yet —
 * prompt tuning and model evaluation — by making sure the raw material for
 * both exists from day one, not retrofitted later.
 */
export interface ExtractionCorrection {
  _id?: string;
  logEntryId: string;
  schemeId: string;
  field: string;
  aiValue: any;
  correctedValue: any;
  correctedBy: string;
  note?: string;
  correctedAt: string | Date;
}

export interface SchemeEmbedding {
  _id?: string;
  schemeId: string;
  embedding: number[];
  textChunk: string;
  updatedAt: string | Date;
}

/**
 * Internal bookkeeping for the Knowledge Update System (docs/prd.md §17.6).
 * Not one of the 8 collections in docs/scheme-database.md — those are the
 * citizen-facing/shared contract. This one exists purely so the monitor step
 * can tell "unchanged since last run" from "worth re-extracting" without
 * refetching and re-running every source on every scheduled run. Nothing
 * outside services/knowledge-update reads it.
 */
export interface SourceSnapshot {
  _id?: string;
  sourceUrl: string;
  /** The scheme this source is expected to update, if known ahead of time. */
  schemeSlug: string | null;
  contentHash: string;
  lastFetchedAt: string | Date;
  lastAction: 'created' | 'updated' | 'flagged_for_review' | 'unchanged' | 'fetch_failed';
  /**
   * Source health (optional, additive) — internal metrics, not a dashboard.
   * Lets a run notice "this source has failed 6 times in a row" before it
   * ever affects a citizen-facing answer.
   */
  consecutiveFailures?: number;
  lastSuccessAt?: string | Date | null;
  lastFetchMs?: number;
  totalRuns?: number;
  totalFailures?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
