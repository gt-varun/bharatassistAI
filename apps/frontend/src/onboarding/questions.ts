import type { CitizenProfile } from '@bharatassist/shared-types';
import type { LucideIcon } from 'lucide-react';
import { INCOME_BANDS, SEGMENTS, STATES } from '../lib/taxonomy';

/**
 * The questions asked once, on the way in.
 *
 * Declared as data rather than as eight hand-written screens for two
 * reasons: the wizard then has no per-question branching to get wrong, and
 * the set can be reordered or trimmed without touching any rendering code.
 *
 * What is asked is decided by what the recommendation engine actually uses
 * (apps/backend/src/services/recommendations/scoringService.ts): `state`,
 * `category`, `gender` and `age` are hard filters, `occupationCategory` and
 * `incomeBand` are the two largest scoring signals. Nothing is asked that
 * would not change what the citizen is shown — with the single exception of
 * their name, which is asked so the app can address a person rather than an
 * account.
 *
 * Everything except `state` is skippable. A sparse profile still produces
 * recommendations; an abandoned form produces none.
 */

export type StepKind = 'language' | 'text' | 'number' | 'choice' | 'searchChoice';

export interface Choice {
  value: string;
  /** i18n key — every option a citizen reads is translated. */
  labelKey?: string;
  /** Already-human text, for values that are proper nouns (state names). */
  label?: string;
  icon?: LucideIcon;
}

export interface OnboardingStep {
  id: string;
  kind: StepKind;
  /** Which profile field the answer is stored on. Absent for `language`. */
  field?: keyof CitizenProfile;
  questionKey: string;
  /** Quiet line under the question — why it is asked, or that it may be skipped. */
  noteKey?: string;
  placeholderKey?: string;
  choices?: Choice[];
  /** Only `state` is required; the rest can be answered later on the profile. */
  required?: boolean;
  /** Layout hint for choice grids on a phone. */
  columns?: 1 | 2;
}

const GENDER_CHOICES: Choice[] = [
  { value: 'female', labelKey: 'gender.female' },
  { value: 'male', labelKey: 'gender.male' },
  { value: 'other', labelKey: 'gender.other' }
];

const CATEGORY_CHOICES: Choice[] = [
  { value: 'general', labelKey: 'cat.general' },
  { value: 'obc', labelKey: 'cat.obc' },
  { value: 'sc', labelKey: 'cat.sc' },
  { value: 'st', labelKey: 'cat.st' },
  { value: 'ews', labelKey: 'cat.ews' }
];

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'language',
    kind: 'language',
    questionKey: 'onboarding.languageQuestion'
  },
  {
    id: 'name',
    kind: 'text',
    field: 'fullName',
    questionKey: 'onboarding.nameQuestion',
    placeholderKey: 'onboarding.namePlaceholder'
  },
  {
    id: 'state',
    kind: 'searchChoice',
    field: 'currentState',
    questionKey: 'onboarding.stateQuestion',
    noteKey: 'onboarding.stateWhy',
    required: true,
    choices: STATES.map((state) => ({ value: state, label: state }))
  },
  {
    id: 'age',
    kind: 'number',
    field: 'age',
    questionKey: 'onboarding.ageQuestion',
    placeholderKey: 'onboarding.agePlaceholder'
  },
  {
    id: 'gender',
    kind: 'choice',
    field: 'gender',
    questionKey: 'onboarding.genderQuestion',
    choices: GENDER_CHOICES,
    columns: 1
  },
  {
    id: 'occupation',
    kind: 'choice',
    field: 'occupationCategory',
    questionKey: 'onboarding.occupationQuestion',
    choices: SEGMENTS.map((segment) => ({
      value: segment.slug,
      labelKey: segment.labelKey,
      icon: segment.icon
    })),
    columns: 2
  },
  {
    id: 'income',
    kind: 'choice',
    field: 'incomeBand',
    questionKey: 'onboarding.incomeQuestion',
    choices: INCOME_BANDS.map((band) => ({ value: band.slug, labelKey: band.labelKey })),
    columns: 1
  },
  {
    id: 'category',
    kind: 'choice',
    field: 'category',
    questionKey: 'onboarding.categoryQuestion',
    noteKey: 'onboarding.categoryWhy',
    choices: CATEGORY_CHOICES,
    columns: 1
  }
];

/**
 * Match something spoken against the options on screen.
 *
 * Someone answering "which state do you live in?" out loud says
 * "Karnataka", not the exact string in a list — and a recogniser may hand
 * back "karnataka.", "Karnātaka" or the name in its own script. Comparison
 * is therefore on a folded form, and both containment directions count, so
 * "I live in Karnataka" still matches.
 *
 * `labels` maps a choice value to its translated label, supplied by the
 * caller because translation is a hook's job, not this module's.
 */
export function matchSpokenChoice(
  spoken: string,
  choices: Choice[],
  labels: Record<string, string>
): string | null {
  const fold = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      // Strip combining marks so "Karnātaka" folds onto "Karnataka".
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

  const heard = fold(spoken);
  if (!heard) return null;

  const candidates = choices.map((choice) => ({
    value: choice.value,
    forms: [labels[choice.value] ?? '', choice.label ?? '', choice.value.replace(/_/g, ' ')]
      .filter(Boolean)
      .map(fold)
  }));

  // An exact hit on any spelling wins outright.
  const exact = candidates.find((c) => c.forms.includes(heard));
  if (exact) return exact.value;

  // Then the longest containment, so "scheduled tribe" is not beaten by
  // "scheduled caste" merely because it was checked first.
  let best: { value: string; length: number } | null = null;
  for (const candidate of candidates) {
    for (const form of candidate.forms) {
      if (form.length < 3) continue;
      if (heard.includes(form) || form.includes(heard)) {
        if (!best || form.length > best.length) best = { value: candidate.value, length: form.length };
      }
    }
  }
  return best?.value ?? null;
}

/** First run of digits in a spoken answer — "I am 35 years" → 35. */
export function parseSpokenNumber(spoken: string): number | null {
  const digits = spoken.match(/\d+/);
  if (!digits) return null;
  const value = Number(digits[0]);
  return Number.isFinite(value) ? value : null;
}
