import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getAvailableLanguages } from '../i18n/config';
import { cn } from '../lib/utils';
import { MicButton, SpeakButton } from '../voice';
import {
  matchSpokenChoice,
  parseSpokenNumber,
  type Choice,
  type OnboardingStep
} from './questions';
import { markOnboardingSkipped, useOnboarding } from './useOnboarding';

/**
 * The way in, for someone who may not read well.
 *
 * Design rules this screen follows, all of them driven by who it is for:
 *
 *   • One question per screen. A form with eight fields is a wall; eight
 *     screens with one question each is a conversation.
 *   • Language is asked first, in the native script, before any question
 *     that would need reading.
 *   • Every question can be heard (speaker) and answered by speaking
 *     (microphone) — including the choice questions, where saying
 *     "Karnataka" selects Karnataka.
 *   • Choosing an option advances the screen. No "next" to hunt for.
 *   • Only the state is required. Everything else is one tap to skip, and
 *     lives on the profile page afterwards.
 */
export const OnboardingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    step,
    index,
    total,
    isLast,
    answers,
    answered,
    canAdvance,
    setAnswer,
    back,
    next,
    save
  } = useOnboarding();

  // Where the citizen was originally headed, preserved through sign-in.
  const destination = (location.state as { from?: string } | null)?.from || '/dashboard';
  const [search, setSearch] = useState('');

  // A new question means a fresh filter box.
  useEffect(() => setSearch(''), [index]);

  const languages = getAvailableLanguages();

  /** Choice labels in the current language — needed for voice matching too. */
  const labelFor = useCallback(
    (choice: Choice) => (choice.labelKey ? t(choice.labelKey) : (choice.label ?? choice.value)),
    [t]
  );

  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    step?.choices?.forEach((choice) => {
      map[choice.value] = labelFor(choice);
    });
    return map;
  }, [step, labelFor]);

  const questionText = step ? t(step.questionKey) : '';
  const noteText = step?.noteKey ? t(step.noteKey) : '';

  const finish = async () => {
    try {
      await save.mutateAsync();
      navigate(destination, { replace: true });
    } catch {
      /* The mutation's error state is rendered below; stay on the step. */
    }
  };

  const advance = () => {
    if (isLast) void finish();
    else next();
  };

  /**
   * Choosing an option moves the screen on by itself — one tap per
   * question, no "next" to find. The exception is the last question:
   * finishing writes the profile and leaves the wizard, which should be a
   * deliberate tap on "Show my schemes" rather than something that happens
   * while a citizen is still reading the options.
   */
  const chooseAndAdvance = (value: string) => {
    setAnswer(step.id, value);
    if (!isLast) window.setTimeout(next, 200);
  };

  const skipEverything = () => {
    markOnboardingSkipped();
    navigate(destination, { replace: true });
  };

  /** Spoken answers, routed by the kind of question on screen. */
  const handleVoice = (spoken: string) => {
    if (!step) return;

    if (step.kind === 'number') {
      const value = parseSpokenNumber(spoken);
      if (value !== null) setAnswer(step.id, value);
      return;
    }

    if (step.kind === 'text') {
      setAnswer(step.id, spoken.trim());
      return;
    }

    if (step.choices) {
      const matched = matchSpokenChoice(spoken, step.choices, labelMap);
      // Speaking an option is as decisive as tapping it.
      if (matched) chooseAndAdvance(matched);
      return;
    }

    if (step.kind === 'language') {
      const matched = matchSpokenChoice(
        spoken,
        languages.map((language) => ({ value: language.code, label: language.nativeName })),
        Object.fromEntries(languages.map((language) => [language.code, language.name]))
      );
      if (matched) void i18n.changeLanguage(matched);
    }
  };

  if (!step) return null;

  const progress = ((index + 1) / total) * 100;

  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-paper pt-safe-t">
      {/* Progress — the only chrome, so the screen stays about the question. */}
      <header className="px-5 pt-5">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule">
              <div
                className="h-full rounded-full bg-sanction transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="register-strong shrink-0">
              {t('onboarding.stepOf', { current: index + 1, total })}
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-5 py-8">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          {index === 0 && (
            <p className="register mb-2">{t('onboarding.title')}</p>
          )}

          {/* The question, and the button that reads it out. */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
              {questionText}
            </h1>
            <SpeakButton text={noteText ? `${questionText}. ${noteText}` : questionText} />
          </div>

          {noteText && (
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{noteText}</p>
          )}

          <div className="mt-7 flex-1">
            {step.kind === 'language' && (
              <ul className="grid grid-cols-2 gap-2.5">
                {languages.map((language) => {
                  const selected = i18n.language === language.code;
                  return (
                    <li key={language.code}>
                      <button
                        type="button"
                        onClick={() => void i18n.changeLanguage(language.code)}
                        aria-pressed={selected}
                        lang={language.code}
                        dir={language.rtl ? 'rtl' : undefined}
                        className={cn(
                          'flex min-h-[3.5rem] w-full flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-colors',
                          selected
                            ? 'border-sanction bg-sanction-tint text-sanction'
                            : 'border-rule-strong bg-surface text-ink hover:border-ink-4'
                        )}
                      >
                        <span className="font-display text-[1.0625rem] font-semibold">
                          {language.nativeName}
                        </span>
                        <span className="register">{language.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {(step.kind === 'text' || step.kind === 'number') && (
              <div className="space-y-4">
                <Input
                  type={step.kind === 'number' ? 'number' : 'text'}
                  inputMode={step.kind === 'number' ? 'numeric' : 'text'}
                  autoFocus
                  value={(answers[step.id] as string | number | undefined) ?? ''}
                  onChange={(e) =>
                    setAnswer(
                      step.id,
                      step.kind === 'number'
                        ? e.target.value === ''
                          ? undefined
                          : Number(e.target.value)
                        : e.target.value
                    )
                  }
                  placeholder={step.placeholderKey ? t(step.placeholderKey) : undefined}
                  className="h-14 text-[1.125rem]"
                />
              </div>
            )}

            {step.kind === 'searchChoice' && (
              <SearchableChoices
                step={step}
                value={answers[step.id] as string | undefined}
                labelFor={labelFor}
                search={search}
                onSearch={setSearch}
                onPick={chooseAndAdvance}
                searchLabel={t('search.state')}
              />
            )}

            {step.kind === 'choice' && step.choices && (
              <ul
                className={cn(
                  'grid gap-2.5',
                  step.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
                )}
              >
                {step.choices.map((choice) => {
                  const Icon = choice.icon;
                  const selected = answers[step.id] === choice.value;
                  return (
                    <li key={choice.value}>
                      <button
                        type="button"
                        onClick={() => chooseAndAdvance(choice.value)}
                        aria-pressed={selected}
                        className={cn(
                          'flex min-h-[3.5rem] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                          selected
                            ? 'border-sanction bg-sanction-tint text-sanction'
                            : 'border-rule-strong bg-surface text-ink hover:border-ink-4'
                        )}
                      >
                        {Icon && <Icon className="h-5 w-5 shrink-0" strokeWidth={1.7} />}
                        <span className="min-w-0 flex-1 text-[1rem] font-medium">
                          {labelFor(choice)}
                        </span>
                        {selected && <Check className="h-5 w-5 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Answer by speaking, on every kind of question. */}
          <div className="mt-8 flex justify-center">
            <MicButton size="lg" showTranscript onResult={handleVoice} />
          </div>

          {save.isError && (
            <p role="alert" className="mt-4 text-center text-[0.875rem] text-seal">
              {t('profile.saveFailed')}
            </p>
          )}
        </div>
      </main>

      {/* Actions sit at the bottom edge, within thumb reach. */}
      <footer className="hair-top bg-paper px-5 pb-[calc(1rem+var(--sab))] pt-4">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-center gap-3">
            {index > 0 ? (
              <Button variant="outline" size="lg" onClick={back} aria-label={t('common.back')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <span />
            )}

            <Button
              size="lg"
              className="flex-1"
              onClick={advance}
              disabled={!canAdvance || save.isPending}
            >
              {save.isPending
                ? t('profile.saving')
                : isLast
                  ? t('onboarding.finish')
                  : // "Skip" only where there is genuinely nothing answered.
                    // The language step always has one — the app is being
                    // read in something — so it never offers to skip.
                    answered === undefined && !step.required && step.kind !== 'language'
                    ? t('common.skip')
                    : t('common.next')}
              {!save.isPending && <ArrowRight className="h-5 w-5" />}
            </Button>
          </div>

          <button
            type="button"
            onClick={skipEverything}
            className="mx-auto mt-3 block py-2 text-[0.875rem] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
          >
            {t('onboarding.skipAll')}
          </button>
        </div>
      </footer>
    </div>
  );
};

/**
 * A long list — the states — as a filterable set of large rows rather than
 * a dropdown. A native select on a phone is a small scrolling wheel; this
 * is 25 targets you can hit with a thumb, and a box to narrow them.
 */
const SearchableChoices: React.FC<{
  step: OnboardingStep;
  value?: string;
  search: string;
  searchLabel: string;
  labelFor: (choice: Choice) => string;
  onSearch: (value: string) => void;
  onPick: (value: string) => void;
}> = ({ step, value, search, searchLabel, labelFor, onSearch, onPick }) => {
  const filtered = (step.choices ?? []).filter((choice) =>
    labelFor(choice).toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[1.15rem] w-[1.15rem] -translate-y-1/2 text-ink-4" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label={searchLabel}
          className="h-12 w-full rounded-md border border-rule-strong bg-surface pl-11 pr-3 text-[1rem] text-ink outline-none focus:border-sanction focus:ring-4 focus:ring-sanction/12"
          autoComplete="off"
        />
      </div>

      <ul className="max-h-[22rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
        {filtered.map((choice) => {
          const selected = value === choice.value;
          return (
            <li key={choice.value}>
              <button
                type="button"
                onClick={() => onPick(choice.value)}
                aria-pressed={selected}
                className={cn(
                  'flex min-h-[3.25rem] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-[1rem] font-medium transition-colors',
                  selected
                    ? 'border-sanction bg-sanction-tint text-sanction'
                    : 'border-rule-strong bg-surface text-ink hover:border-ink-4'
                )}
              >
                <span className="min-w-0 truncate">{labelFor(choice)}</span>
                {selected && <Check className="h-5 w-5 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
