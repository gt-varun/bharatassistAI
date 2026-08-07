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
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CitizenProfile {
  _id?: string;
  userId: string;
  state: string;
  district?: string | null;
  age?: number | null;
  gender?: string | null;
  occupationCategory?: string | null;
  incomeBand?: string | null;
  educationLevel?: string | null;
  category?: string | null;
  disabilityStatus?: boolean | null;
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
}

export interface SchemeEmbedding {
  _id?: string;
  schemeId: string;
  embedding: number[];
  textChunk: string;
  updatedAt: string | Date;
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
