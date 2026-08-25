import type { Scheme, CitizenProfile, ApplicationField } from '@bharatassist/shared-types';
import type { ProfileLike } from '../checklist/checklistGenerator.js';

export interface GuidanceField {
  fieldName: string;
  instructions: string;
  mandatory: boolean;
  prefilledValue?: any;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface ApplicationGuidanceResult {
  fieldByFieldGuidance: GuidanceField[];
  commonMistakes: string[];
  glossary: GlossaryTerm[];
  officialPortalUrl: string;
  portalValid: boolean;
  readyToApply: boolean;
  notes?: string;
}

/**
 * Standard terminology dictionary used to match and extract dynamic glossary terms
 * from scheme application fields and common mistakes text.
 */
const TERMINOLOGY_DICTIONARY: Record<string, { term: string; definition: string }> = {
  aadhaar: {
    term: 'Aadhaar Seeding',
    definition: 'Linking your 12-digit Aadhaar number directly with your bank account for Direct Benefit Transfer (DBT).'
  },
  bonafide: {
    term: 'Bonafide Certificate',
    definition: 'An official document issued by an educational institution proving your current enrollment.'
  },
  taluk: {
    term: 'Taluk / Tehsildar Office',
    definition: 'Local revenue administration office responsible for issuing income, caste, and residence certificates.'
  },
  ifsc: {
    term: 'IFSC Code',
    definition: '11-character alphanumeric code identifying your specific bank branch for electronic money transfers.'
  },
  ews: {
    term: 'EWS Certificate',
    definition: 'Economically Weaker Section certificate proving household income below statutory thresholds.'
  },
  bpl: {
    term: 'BPL Card',
    definition: 'Below Poverty Line ration card issued by state civil supplies departments.'
  },
  dbt: {
    term: 'Direct Benefit Transfer (DBT)',
    definition: 'Government benefit transfer directly credited to the beneficiary bank account without intermediaries.'
  }
};

/**
 * Validates whether a URL string is formatted properly as http/https.
 */
function validateUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '') {
    return false;
  }
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generates dynamic application guidance for a scheme.
 *
 * Extract fields, maps profile defaults, extracts dynamic glossary terms from scheme text,
 * validates the official portal link, and computes `readyToApply`.
 */
export function generateApplicationGuidance(
  scheme: Scheme | null | undefined,
  profile?: ProfileLike | null
): ApplicationGuidanceResult {
  if (!scheme) {
    return {
      fieldByFieldGuidance: [],
      commonMistakes: [],
      glossary: [],
      officialPortalUrl: '',
      portalValid: false,
      readyToApply: false,
      notes: 'Scheme details not available.'
    };
  }

  // 1. Field-by-Field Guidance Generation
  const rawFields = scheme.applicationFields || [];
  const fieldByFieldGuidance: GuidanceField[] = rawFields.map((field: ApplicationField) => {
    const nameLower = field.fieldName.toLowerCase();
    let prefilledValue: any = undefined;

    if (profile) {
      if (nameLower.includes('name')) prefilledValue = profile.userId ? undefined : undefined;
      if (nameLower.includes('state')) prefilledValue = profile.currentState ?? profile.state;
      if (nameLower.includes('district')) prefilledValue = profile.district;
      if (nameLower.includes('age')) prefilledValue = profile.age;
      if (nameLower.includes('gender')) prefilledValue = profile.gender;
      if (nameLower.includes('occupation') || nameLower.includes('profession'))
        prefilledValue = profile.occupationCategory;
      if (nameLower.includes('category') || nameLower.includes('caste'))
        prefilledValue = profile.category;
    }

    return {
      fieldName: field.fieldName,
      instructions: field.instructions || 'Ensure details match official government identity cards.',
      mandatory: field.mandatory,
      ...(prefilledValue !== undefined ? { prefilledValue } : {})
    };
  });

  // 2. Common Mistakes List
  const commonMistakes =
    scheme.commonMistakes && scheme.commonMistakes.length > 0
      ? scheme.commonMistakes
      : ['Name mismatch with Aadhaar card spelling', 'Submitting expired or unverified certificates'];

  // 3. Dynamic Glossary Extraction from Scheme Text
  const fullTextToScan = (
    rawFields.map((f) => `${f.fieldName} ${f.instructions}`).join(' ') +
    ' ' +
    commonMistakes.join(' ') +
    ' ' +
    (scheme.requiredDocuments || []).map((d) => `${d.label} ${d.howToObtain}`).join(' ')
  ).toLowerCase();

  const glossaryMap = new Map<string, GlossaryTerm>();
  for (const [key, termObj] of Object.entries(TERMINOLOGY_DICTIONARY)) {
    if (fullTextToScan.includes(key)) {
      glossaryMap.set(termObj.term, termObj);
    }
  }

  // Fallback glossary terms if scan found no specific keywords
  if (glossaryMap.size === 0) {
    glossaryMap.set(TERMINOLOGY_DICTIONARY.aadhaar.term, TERMINOLOGY_DICTIONARY.aadhaar);
    glossaryMap.set(TERMINOLOGY_DICTIONARY.taluk.term, TERMINOLOGY_DICTIONARY.taluk);
  }

  const glossary: GlossaryTerm[] = Array.from(glossaryMap.values());

  // 4. Portal URL Validation
  const portalUrl = scheme.officialPortalUrl || '';
  const portalValid = validateUrl(portalUrl);

  // 5. readyToApply Calculation
  const readyToApply = portalValid && (rawFields.length > 0 || (scheme.requiredDocuments && scheme.requiredDocuments.length > 0));

  let notes: string | undefined;
  if (!portalValid) {
    notes = 'Official application portal URL is currently unverified or unavailable.';
  }

  return {
    fieldByFieldGuidance,
    commonMistakes,
    glossary,
    officialPortalUrl: portalUrl,
    portalValid,
    readyToApply,
    ...(notes ? { notes } : {})
  };
}
