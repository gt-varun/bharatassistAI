import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CitizenProfile } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PROFILE_QUERY_KEY } from '../hooks/useCitizenProfile';
import { ONBOARDING_STEPS } from './questions';

/** Set once someone chooses "fill this in later", so they are asked once. */
export const ONBOARDING_SKIPPED_KEY = 'bharatassist_onboarding_skipped';

export const markOnboardingSkipped = (): void => {
  try {
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, '1');
  } catch {
    /* A device that refuses storage just gets asked again. Not worth failing. */
  }
};

export const wasOnboardingSkipped = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_SKIPPED_KEY) === '1';
  } catch {
    return false;
  }
};

type Answers = Partial<Record<string, string | number>>;

/**
 * The wizard's state and its one side effect.
 *
 * Answers are held here and written **once**, at the end, through the same
 * `PUT /profile` the profile screen uses — there is no second way to save a
 * citizen profile in this codebase. Saving per step would leave half-filled
 * profiles behind every abandoned run.
 */
export function useOnboarding() {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const steps = ONBOARDING_STEPS;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const setAnswer = useCallback((stepId: string, value: string | number | undefined) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (value === undefined || value === '') delete next[stepId];
      else next[stepId] = value;
      return next;
    });
  }, []);

  const answered = step ? answers[step.id] : undefined;
  const canAdvance = !step?.required || answered !== undefined;

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIndex((i) => Math.min(steps.length - 1, i + 1)),
    [steps.length]
  );

  /** Answers mapped onto the profile shape the API expects. */
  const profileDraft = useMemo(() => {
    const draft: Partial<CitizenProfile> = {};
    for (const definition of steps) {
      if (!definition.field) continue;
      const value = answers[definition.id];
      if (value === undefined || value === '') continue;
      (draft as Record<string, unknown>)[definition.field] =
        definition.kind === 'number' ? Number(value) : value;
    }
    return draft;
  }, [answers, steps]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put('/profile', profileDraft);
      return res.data?.data as CitizenProfile;
    },
    onSuccess: (saved) => {
      /*
       * Write the saved profile straight into the cache rather than
       * invalidating it.
       *
       * Invalidating looks equivalent and is not: it leaves the previous
       * value — `null`, because this citizen had no profile a moment ago —
       * in place while the refetch is in flight. The onboarding gate reads
       * that cache to decide whether someone still needs to be asked, so
       * for the width of one request it saw "no profile" and bounced the
       * citizen straight back to the questions they had just answered.
       *
       * The PUT response *is* the new profile, so there is nothing to go
       * and fetch: seeding it is both correct and one request cheaper.
       */
      queryClient.setQueryData(PROFILE_QUERY_KEY, saved);

      // Recommendations, though, were computed against an empty profile and
      // genuinely have to be asked for again.
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recommendations'] });
    }
  });

  return {
    steps,
    step,
    index,
    total: steps.length,
    isLast,
    answers,
    answered,
    canAdvance,
    setAnswer,
    back,
    next,
    save,
    profileDraft
  };
}
