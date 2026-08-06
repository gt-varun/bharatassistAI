import type {
  EligibilityRules,
  AdditionalCondition,
  CitizenProfile,
  EligibilityResult
} from '@bharatassist/shared-types';

/**
 * Flexible input schema for evaluating eligibility.
 * Accepts full/partial CitizenProfile values or custom questionnaire responses.
 */
export type EvaluationInput = Partial<CitizenProfile> & {
  income?: number | null;
  [key: string]: any;
};

/**
 * The evaluation result returned by the deterministic rule engine.
 */
export type RuleEngineOutput = Pick<EligibilityResult, 'status' | 'reasons' | 'missingRequirements'>;

/**
 * Helper to extract a numeric income value from either explicit numeric `income` or `incomeBand` string.
 */
function parseIncome(input: EvaluationInput): number | null {
  if (typeof input.income === 'number' && !isNaN(input.income)) {
    return input.income;
  }

  if (!input.incomeBand) {
    return null;
  }

  const band = input.incomeBand.trim().toLowerCase();
  
  // Try parsing plain numbers like "250000"
  const rawNum = Number(band);
  if (!isNaN(rawNum)) return rawNum;

  // Handle common Indian income band notations
  if (band.includes('<2.5l') || band.includes('< 2.5l') || band.includes('below 2.5') || band === '<2.5l') {
    return 249999;
  }
  if (band.includes('2.5l-5l') || band.includes('2.5l - 5l')) {
    return 375000;
  }
  if (band.includes('>5l') || band.includes('> 5l') || band.includes('above 5l')) {
    return 500001;
  }

  // Regex fallback for lakh values e.g. "2.5L" -> 250000
  const lakhMatch = band.match(/([\d.]+)\s*l/);
  if (lakhMatch) {
    return parseFloat(lakhMatch[1]) * 100000;
  }

  return null;
}

/**
 * Evaluates an additional generic condition against the citizen's input data.
 */
function evaluateAdditionalCondition(
  condition: AdditionalCondition,
  input: EvaluationInput
): { passed: boolean; missing: boolean; message: string } {
  const { field, operator, value } = condition;
  const userVal = input[field];

  if (userVal === undefined || userVal === null || userVal === '') {
    return {
      passed: false,
      missing: true,
      message: `Required information missing for criterion: ${field}`
    };
  }

  const fieldLabel = field.replace(/([A-Z])/g, ' $1').toLowerCase();

  switch (operator) {
    case 'equals': {
      const isMatch = typeof userVal === 'string' && typeof value === 'string'
        ? userVal.trim().toLowerCase() === value.trim().toLowerCase()
        : userVal === value;
      return {
        passed: isMatch,
        missing: false,
        message: isMatch
          ? `${fieldLabel} matches requirements (${userVal})`
          : `${fieldLabel} does not match requirement (expected: ${value}, actual: ${userVal})`
      };
    }
    case 'in': {
      const targetArray = Array.isArray(value) ? value : [value];
      const normalizedTarget = targetArray.map((v) => (typeof v === 'string' ? v.toLowerCase() : v));
      const userValNormalized = typeof userVal === 'string' ? userVal.toLowerCase() : userVal;

      const isMatch = Array.isArray(userVal)
        ? userVal.some((v) => normalizedTarget.includes(typeof v === 'string' ? v.toLowerCase() : v))
        : normalizedTarget.includes(userValNormalized);

      return {
        passed: isMatch,
        missing: false,
        message: isMatch
          ? `${fieldLabel} matches accepted options (${userVal})`
          : `${fieldLabel} must be one of: ${targetArray.join(', ')} (your value: ${userVal})`
      };
    }
    case 'not_in': {
      const targetArray = Array.isArray(value) ? value : [value];
      const normalizedTarget = targetArray.map((v) => (typeof v === 'string' ? v.toLowerCase() : v));
      const userValNormalized = typeof userVal === 'string' ? userVal.toLowerCase() : userVal;

      const isForbidden = Array.isArray(userVal)
        ? userVal.some((v) => normalizedTarget.includes(typeof v === 'string' ? v.toLowerCase() : v))
        : normalizedTarget.includes(userValNormalized);

      return {
        passed: !isForbidden,
        missing: false,
        message: !isForbidden
          ? `${fieldLabel} satisfies restriction`
          : `${fieldLabel} cannot be one of: ${targetArray.join(', ')} (your value: ${userVal})`
      };
    }
    case 'gte': {
      const numUser = Number(userVal);
      const numVal = Number(value);
      const passed = !isNaN(numUser) && !isNaN(numVal) && numUser >= numVal;
      return {
        passed,
        missing: false,
        message: passed
          ? `${fieldLabel} meets minimum requirement of ${value}`
          : `${fieldLabel} must be at least ${value} (your value: ${userVal})`
      };
    }
    case 'lte': {
      const numUser = Number(userVal);
      const numVal = Number(value);
      const passed = !isNaN(numUser) && !isNaN(numVal) && numUser <= numVal;
      return {
        passed,
        missing: false,
        message: passed
          ? `${fieldLabel} is within maximum limit of ${value}`
          : `${fieldLabel} must not exceed ${value} (your value: ${userVal})`
      };
    }
    case 'between': {
      const numUser = Number(userVal);
      const [min, max] = Array.isArray(value) ? [Number(value[0]), Number(value[1])] : [NaN, NaN];
      const passed = !isNaN(numUser) && !isNaN(min) && !isNaN(max) && numUser >= min && numUser <= max;
      return {
        passed,
        missing: false,
        message: passed
          ? `${fieldLabel} is within range ${min}–${max}`
          : `${fieldLabel} must be between ${min} and ${max} (your value: ${userVal})`
      };
    }
    default:
      return {
        passed: false,
        missing: false,
        message: `Unknown operator ${operator} for condition on ${field}`
      };
  }
}

/**
 * Deterministically evaluates a citizen's profile/answers against scheme eligibility rules.
 * 
 * Rules are checked strictly per specification:
 * - Returns 'eligible' if all specified rules are met.
 * - Returns 'not_eligible' if any explicit rule is violated.
 * - Returns 'partially_eligible' if required profile fields are missing while no explicit rule fails.
 */
export function evaluateEligibility(
  rules: EligibilityRules | null | undefined,
  input: EvaluationInput = {}
): RuleEngineOutput {
  const reasons: string[] = [];
  const missingRequirements: string[] = [];
  let hasExplicitFailure = false;
  let hasMissingFields = false;

  if (!rules || Object.keys(rules).length === 0) {
    return {
      status: 'eligible',
      reasons: ['No specific eligibility restrictions recorded for this scheme.'],
      missingRequirements: []
    };
  }

  // 1. State Rule
  if (rules.state && rules.state.length > 0) {
    const isAllState = rules.state.some(
      (s) => s.toLowerCase() === 'all' || s.toLowerCase() === 'india' || s.toLowerCase() === 'national'
    );
    if (!isAllState) {
      if (!input.state) {
        hasMissingFields = true;
        missingRequirements.push(`State of residence required (eligible states: ${rules.state.join(', ')})`);
      } else {
        const matched = rules.state.some((s) => s.toLowerCase() === input.state?.toLowerCase());
        if (matched) {
          reasons.push(`Resides in eligible state (${input.state})`);
        } else {
          hasExplicitFailure = true;
          missingRequirements.push(
            `Must reside in ${rules.state.join(', ')} (your state: ${input.state})`
          );
        }
      }
    }
  }

  // 2. Age Rules
  if (rules.ageMin !== undefined && rules.ageMin !== null) {
    if (input.age === undefined || input.age === null) {
      hasMissingFields = true;
      missingRequirements.push(`Age is required (minimum age: ${rules.ageMin} years)`);
    } else if (input.age < rules.ageMin) {
      hasExplicitFailure = true;
      missingRequirements.push(
        `Minimum age required is ${rules.ageMin} years (your age: ${input.age})`
      );
    } else {
      reasons.push(`Age meets minimum requirement of ${rules.ageMin} years (${input.age} years old)`);
    }
  }

  if (rules.ageMax !== undefined && rules.ageMax !== null) {
    if (input.age === undefined || input.age === null) {
      if (!missingRequirements.some((r) => r.includes('Age is required'))) {
        hasMissingFields = true;
        missingRequirements.push(`Age is required (maximum age: ${rules.ageMax} years)`);
      }
    } else if (input.age > rules.ageMax) {
      hasExplicitFailure = true;
      missingRequirements.push(
        `Maximum age limit is ${rules.ageMax} years (your age: ${input.age})`
      );
    } else {
      reasons.push(`Age is within maximum limit of ${rules.ageMax} years (${input.age} years old)`);
    }
  }

  // 3. Income Rule
  if (rules.incomeMax !== undefined && rules.incomeMax !== null) {
    const userIncome = parseIncome(input);
    if (userIncome === null) {
      hasMissingFields = true;
      missingRequirements.push(
        `Household income details required (maximum limit: ₹${rules.incomeMax.toLocaleString('en-IN')})`
      );
    } else if (userIncome > rules.incomeMax) {
      hasExplicitFailure = true;
      missingRequirements.push(
        `Annual household income must not exceed ₹${rules.incomeMax.toLocaleString('en-IN')} (your income: ₹${userIncome.toLocaleString('en-IN')})`
      );
    } else {
      reasons.push(
        `Household income is within the maximum limit of ₹${rules.incomeMax.toLocaleString('en-IN')}`
      );
    }
  }

  // 4. Occupation Category Rule
  if (rules.occupationCategory && rules.occupationCategory.length > 0) {
    if (!input.occupationCategory) {
      hasMissingFields = true;
      missingRequirements.push(
        `Occupation category required (eligible: ${rules.occupationCategory.join(', ')})`
      );
    } else {
      const userOcc = input.occupationCategory.toLowerCase();
      const matched = rules.occupationCategory.some((o) => o.toLowerCase() === userOcc);
      if (matched) {
        reasons.push(`Occupation category matches (${input.occupationCategory})`);
      } else {
        hasExplicitFailure = true;
        missingRequirements.push(
          `Targeted occupation category: ${rules.occupationCategory.join(', ')} (your occupation: ${input.occupationCategory})`
        );
      }
    }
  }

  // 5. Gender Restriction Rule
  if (rules.genderRestriction && rules.genderRestriction.trim() !== '') {
    const normRestriction = rules.genderRestriction.toLowerCase();
    if (normRestriction !== 'all' && normRestriction !== 'any') {
      if (!input.gender) {
        hasMissingFields = true;
        missingRequirements.push(`Gender required (eligible: ${rules.genderRestriction})`);
      } else {
        const userGender = input.gender.toLowerCase();
        if (userGender === normRestriction) {
          reasons.push(`Gender restriction satisfied (${input.gender})`);
        } else {
          hasExplicitFailure = true;
          missingRequirements.push(
            `Scheme restricted to ${rules.genderRestriction} applicants (your gender: ${input.gender})`
          );
        }
      }
    }
  }

  // 6. Category Restriction Rule
  if (rules.categoryRestriction && rules.categoryRestriction.length > 0) {
    if (!input.category) {
      hasMissingFields = true;
      missingRequirements.push(
        `Social category required (eligible: ${rules.categoryRestriction.join(', ')})`
      );
    } else {
      const userCat = input.category.toLowerCase();
      const matched = rules.categoryRestriction.some((c) => c.toLowerCase() === userCat);
      if (matched) {
        reasons.push(`Social category matches (${input.category})`);
      } else {
        hasExplicitFailure = true;
        missingRequirements.push(
          `Eligible social categories: ${rules.categoryRestriction.join(', ')} (your category: ${input.category})`
        );
      }
    }
  }

  // 7. Additional Conditions
  if (rules.additionalConditions && rules.additionalConditions.length > 0) {
    for (const condition of rules.additionalConditions) {
      const result = evaluateAdditionalCondition(condition, input);
      if (result.missing) {
        hasMissingFields = true;
        missingRequirements.push(result.message);
      } else if (!result.passed) {
        hasExplicitFailure = true;
        missingRequirements.push(result.message);
      } else {
        reasons.push(result.message);
      }
    }
  }

  // Determine overall status
  let status: 'eligible' | 'partially_eligible' | 'not_eligible';
  if (hasExplicitFailure) {
    status = 'not_eligible';
  } else if (hasMissingFields) {
    status = 'partially_eligible';
  } else {
    status = 'eligible';
  }

  return {
    status,
    reasons,
    missingRequirements
  };
}
