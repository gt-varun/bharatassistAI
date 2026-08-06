import type {
  EligibilityRules,
  CitizenProfile,
  AdditionalCondition
} from '@bharatassist/shared-types';

/**
 * Question interface representing a scheme-specific eligibility question.
 */
export interface EligibilityQuestion {
  id: string;
  field: string;
  questionKey: string;
  question: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  options?: string[];
  required: boolean;
  prefilled: boolean;
  currentValue?: any;
}

/**
 * Centralized question template definitions for i18n key generation and default text.
 */
const QUESTION_TEMPLATES: Record<string, { key: string; text: string }> = {
  state: {
    key: 'eligibility.questions.state',
    text: 'Which state do you currently reside in?'
  },
  age: {
    key: 'eligibility.questions.age',
    text: 'What is your current age (in years)?'
  },
  income: {
    key: 'eligibility.questions.income',
    text: 'What is your annual household income?'
  },
  occupationCategory: {
    key: 'eligibility.questions.occupationCategory',
    text: 'What is your primary occupation or category?'
  },
  gender: {
    key: 'eligibility.questions.gender',
    text: 'What is your gender?'
  },
  category: {
    key: 'eligibility.questions.category',
    text: 'Which social category do you belong to?'
  }
};

/**
 * Helper to determine input question type based on condition operator.
 */
function inferConditionType(
  operator: AdditionalCondition['operator']
): 'text' | 'number' | 'select' | 'multiselect' | 'boolean' {
  switch (operator) {
    case 'gte':
    case 'lte':
    case 'between':
      return 'number';
    case 'in':
      return 'multiselect';
    case 'not_in':
    case 'equals':
      return 'select';
    default:
      return 'text';
  }
}

/**
 * Helper to format field names into human-readable label strings.
 */
function formatFieldLabel(field: string): string {
  const camelSpaced = field.replace(/([A-Z])/g, ' $1').toLowerCase();
  return camelSpaced.charAt(0).toUpperCase() + camelSpaced.slice(1);
}

/**
 * Generates a deterministic sequence of scheme-specific questions derived strictly
 * from the scheme's `EligibilityRules`.
 *
 * Checks against the user's `CitizenProfile` (if provided) to set `prefilled: true`
 * and populate `currentValue` for known fields.
 */
export function generateEligibilityQuestions(
  rules: EligibilityRules | null | undefined,
  profile?: Partial<CitizenProfile> & { income?: number | null; [key: string]: any }
): EligibilityQuestion[] {
  if (!rules || Object.keys(rules).length === 0) {
    return [];
  }

  const questions: EligibilityQuestion[] = [];

  // 1. State Question
  if (rules.state && rules.state.length > 0) {
    const isAll = rules.state.some(
      (s) => s.toLowerCase() === 'all' || s.toLowerCase() === 'national' || s.toLowerCase() === 'india'
    );
    if (!isAll) {
      const value = profile?.state ?? null;
      questions.push({
        id: 'q_state',
        field: 'state',
        questionKey: QUESTION_TEMPLATES.state.key,
        question: QUESTION_TEMPLATES.state.text,
        type: 'select',
        options: rules.state,
        required: true,
        prefilled: Boolean(value),
        currentValue: value
      });
    }
  }

  // 2. Age Question
  if (
    (rules.ageMin !== undefined && rules.ageMin !== null) ||
    (rules.ageMax !== undefined && rules.ageMax !== null)
  ) {
    const value = profile?.age ?? null;
    questions.push({
      id: 'q_age',
      field: 'age',
      questionKey: QUESTION_TEMPLATES.age.key,
      question: QUESTION_TEMPLATES.age.text,
      type: 'number',
      required: true,
      prefilled: value !== null && value !== undefined,
      currentValue: value
    });
  }

  // 3. Income Question
  if (rules.incomeMax !== undefined && rules.incomeMax !== null) {
    const rawIncome = profile?.income ?? profile?.incomeBand ?? null;
    questions.push({
      id: 'q_income',
      field: 'income',
      questionKey: QUESTION_TEMPLATES.income.key,
      question: QUESTION_TEMPLATES.income.text,
      type: 'number',
      required: true,
      prefilled: rawIncome !== null && rawIncome !== undefined,
      currentValue: rawIncome
    });
  }

  // 4. Occupation Category Question
  if (rules.occupationCategory && rules.occupationCategory.length > 0) {
    const value = profile?.occupationCategory ?? null;
    questions.push({
      id: 'q_occupationCategory',
      field: 'occupationCategory',
      questionKey: QUESTION_TEMPLATES.occupationCategory.key,
      question: QUESTION_TEMPLATES.occupationCategory.text,
      type: 'select',
      options: rules.occupationCategory,
      required: true,
      prefilled: Boolean(value),
      currentValue: value
    });
  }

  // 5. Gender Question
  if (rules.genderRestriction && rules.genderRestriction.trim() !== '') {
    const norm = rules.genderRestriction.toLowerCase();
    if (norm !== 'all' && norm !== 'any') {
      const value = profile?.gender ?? null;
      questions.push({
        id: 'q_gender',
        field: 'gender',
        questionKey: QUESTION_TEMPLATES.gender.key,
        question: QUESTION_TEMPLATES.gender.text,
        type: 'select',
        options: ['Female', 'Male', 'Transgender', 'Other'],
        required: true,
        prefilled: Boolean(value),
        currentValue: value
      });
    }
  }

  // 6. Social Category Question
  if (rules.categoryRestriction && rules.categoryRestriction.length > 0) {
    const value = profile?.category ?? null;
    questions.push({
      id: 'q_category',
      field: 'category',
      questionKey: QUESTION_TEMPLATES.category.key,
      question: QUESTION_TEMPLATES.category.text,
      type: 'select',
      options: rules.categoryRestriction,
      required: true,
      prefilled: Boolean(value),
      currentValue: value
    });
  }

  // 7. Additional Conditions Questions
  if (rules.additionalConditions && rules.additionalConditions.length > 0) {
    for (const condition of rules.additionalConditions) {
      const value = profile?.[condition.field] ?? null;
      const type = inferConditionType(condition.operator);
      const label = formatFieldLabel(condition.field);

      let options: string[] | undefined;
      if (Array.isArray(condition.value)) {
        options = condition.value.map(String);
      } else if (typeof condition.value === 'string' && (type === 'select' || type === 'multiselect')) {
        options = [condition.value];
      }

      questions.push({
        id: `q_add_${condition.field}`,
        field: condition.field,
        questionKey: `eligibility.questions.${condition.field}`,
        question: `Please specify your ${label}`,
        type,
        ...(options ? { options } : {}),
        required: true,
        prefilled: value !== null && value !== undefined && value !== '',
        currentValue: value
      });
    }
  }

  return questions;
}
