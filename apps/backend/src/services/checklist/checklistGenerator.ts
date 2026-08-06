import type {
  Scheme,
  CitizenProfile,
  EligibilityResult,
  RequiredDocument
} from '@bharatassist/shared-types';

/**
 * Supported document checklist item statuses.
 * Includes 'not_required' and 'not_applicable' so no documents are omitted.
 */
export type ChecklistItemStatus =
  | 'required'
  | 'pending'
  | 'completed'
  | 'have'
  | 'missing'
  | 'not_required'
  | 'not_applicable';

/**
 * Personalized checklist item structure.
 */
export interface PersonalizedChecklistItem {
  label: string;
  status: ChecklistItemStatus;
  howToObtain: string;
  mandatory: boolean;
}

/**
 * Generates a personalized document checklist generically for any scheme record.
 *
 * Reuses `scheme.requiredDocuments` and matches items against the citizen's profile
 * and eligibility evaluation result. Never omits documents from the list—instead assigns
 * explicit statuses like 'not_required' or 'not_applicable'.
 */
/**
 * A profile as it arrives from Mongoose `.lean()`: structurally a
 * CitizenProfile, but `_id` is an ObjectId rather than a string. The
 * generator only ever reads domain fields, so accept either shape instead of
 * forcing every call site to cast.
 */
export type ProfileLike = Partial<Omit<CitizenProfile, '_id'>> & { _id?: unknown };

/** Same story for an eligibility result read back with `.lean()`. */
export type EligibilityResultLike = Partial<Omit<EligibilityResult, '_id'>> & { _id?: unknown };

export function generatePersonalizedChecklist(
  scheme: Scheme | null | undefined,
  profile?: ProfileLike | null,
  eligibilityResult?: EligibilityResultLike | null
): PersonalizedChecklistItem[] {
  if (!scheme || !scheme.requiredDocuments || scheme.requiredDocuments.length === 0) {
    return [];
  }

  const missingSet = new Set(
    (eligibilityResult?.missingRequirements || []).map((req) => req.toLowerCase())
  );

  return scheme.requiredDocuments.map((doc: RequiredDocument) => {
    const labelLower = doc.label.toLowerCase();
    let status: ChecklistItemStatus = doc.mandatory ? 'required' : 'pending';

    // Generic applicability check 1: Disability Certificate
    if (
      (labelLower.includes('disability') || labelLower.includes('pwd')) &&
      profile?.disabilityStatus === false
    ) {
      status = 'not_applicable';
    }

    // Generic applicability check 2: Caste / Community Certificate
    else if (
      (labelLower.includes('caste') || labelLower.includes('category') || labelLower.includes('community')) &&
      profile?.category?.toLowerCase() === 'general'
    ) {
      status = 'not_required';
    }

    // Generic check 3: Missing requirement explicitly flagged in eligibility evaluation
    else if (missingSet.has(labelLower) || Array.from(missingSet).some((m) => m.includes(labelLower))) {
      status = 'missing';
    }

    return {
      label: doc.label,
      status,
      howToObtain: doc.howToObtain || 'Refer to official scheme guidelines or local authority office.',
      mandatory: doc.mandatory
    };
  });
}
