import type { Scheme, EligibilityRules } from '@bharatassist/shared-types';

export interface SchemeComparisonColumn {
  schemeId: string;
  schemeName: string;
  slug: string;
  department: string;
  level: 'central' | 'state';
  state: string | null;
  eligibilitySummary: string;
  requiredDocuments: { label: string; mandatory: boolean }[];
  requiredDocumentsCount: number;
  benefits: string;
  benefitType: string;
  applicationDeadline: string | null;
  applicationMode: 'online' | 'offline' | 'both';
  officialPortalUrl: string;
}

export interface SchemeComparisonResult {
  schemes: SchemeComparisonColumn[];
  differingFields: string[];
  differences: Record<string, boolean>;
}

/**
 * Builds a clean, structured, deterministic eligibility summary string from `EligibilityRules`.
 */
function buildDeterministicEligibilitySummary(rules?: EligibilityRules | null): string {
  if (!rules || Object.keys(rules).length === 0) {
    return 'Open to all citizens';
  }

  const parts: string[] = [];

  if (rules.state && rules.state.length > 0) {
    const isAll = rules.state.some((s) =>
      ['all', 'india', 'national'].includes(s.toLowerCase())
    );
    parts.push(isAll ? 'National (All States)' : `State: ${rules.state.join(', ')}`);
  }

  if (rules.ageMin != null && rules.ageMax != null) {
    parts.push(`Age: ${rules.ageMin}–${rules.ageMax} yrs`);
  } else if (rules.ageMin != null) {
    parts.push(`Age: Min ${rules.ageMin} yrs`);
  } else if (rules.ageMax != null) {
    parts.push(`Age: Max ${rules.ageMax} yrs`);
  }

  if (rules.incomeMax != null) {
    parts.push(`Income Max: ₹${rules.incomeMax.toLocaleString('en-IN')}/yr`);
  }

  if (rules.occupationCategory && rules.occupationCategory.length > 0) {
    parts.push(`Occupation: ${rules.occupationCategory.join(', ')}`);
  }

  if (rules.categoryRestriction && rules.categoryRestriction.length > 0) {
    parts.push(`Category: ${rules.categoryRestriction.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Open to all citizens';
}

/**
 * Normalizes scheme documents and detects field differences across 2–4 schemes.
 */
export function compareSchemesList(schemes: Scheme[]): SchemeComparisonResult {
  if (!schemes || schemes.length === 0) {
    return {
      schemes: [],
      differingFields: [],
      differences: {}
    };
  }

  const columns: SchemeComparisonColumn[] = schemes.map((scheme) => {
    const docs = (scheme.requiredDocuments || []).map((d) => ({
      label: d.label,
      mandatory: d.mandatory
    }));

    return {
      schemeId: String(scheme._id || scheme.slug),
      schemeName: scheme.name,
      slug: scheme.slug,
      department: scheme.department,
      level: scheme.level,
      state: scheme.state ?? 'Central (All States)',
      eligibilitySummary:
        scheme.eligibilitySummaryPlain ||
        buildDeterministicEligibilitySummary(scheme.eligibilityRules),
      requiredDocuments: docs,
      requiredDocumentsCount: docs.length,
      benefits: scheme.benefitSummary,
      benefitType: scheme.benefitType,
      applicationDeadline: scheme.deadline ? new Date(scheme.deadline).toISOString() : 'Rolling / Open',
      applicationMode: scheme.applicationMode,
      officialPortalUrl: scheme.officialPortalUrl
    };
  });

  // Difference detection logic across columns
  const fieldsToCheck: Array<keyof SchemeComparisonColumn> = [
    'level',
    'state',
    'benefitType',
    'applicationMode',
    'requiredDocumentsCount',
    'applicationDeadline',
    'eligibilitySummary'
  ];

  const differingFields: string[] = [];
  const differences: Record<string, boolean> = {};

  for (const field of fieldsToCheck) {
    const firstVal = String(columns[0][field]);
    const isDifferent = columns.some((col) => String(col[field]) !== firstVal);
    differences[field] = isDifferent;
    if (isDifferent) {
      differingFields.push(field);
    }
  }

  return {
    schemes: columns,
    differingFields,
    differences
  };
}
