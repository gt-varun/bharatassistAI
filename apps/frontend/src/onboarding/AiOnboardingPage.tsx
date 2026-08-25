import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  HelpCircle,
  PhoneCall,
  Volume2,
  VolumeX,
  Sparkles,
  Search,
  Building2,
  Users,
  Edit2,
  RotateCcw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getAvailableLanguages } from '../i18n/config';
import { STATES } from '../lib/taxonomy';
import { cn } from '../lib/utils';
import { MicButton, SpeakButton, useSpeak } from '../voice';
import {
  matchSpokenChoice,
  matchSpokenState,
  parseSpokenAgeOrBirthYear,
  type Choice,
  type OnboardingStep
} from './questions';
import { markOnboardingSkipped, useOnboarding } from './useOnboarding';

interface PendingConfirmation {
  stepId: string;
  fieldLabel: string;
  rawValue: string | number;
  displayValue: string;
}

export const AiOnboardingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from || '/dashboard';

  const {
    steps,
    step,
    index,
    total,
    isLast,
    setAnswer,
    back,
    next,
    save,
    profileDraft
  } = useOnboarding();

  // Mode and conversational states
  const [showSummary, setShowSummary] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [simplifiedExplanation, setSimplifiedExplanation] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(true);

  const { say, speaking: isSpeaking, stop } = useSpeak();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const languages = getAvailableLanguages();

  /** Choice labels in current language */
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

  // Auto-scroll when conversation advances
  useEffect(() => {
    if (typeof chatEndRef.current?.scrollIntoView === 'function') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [index, pendingConfirmation, showSummary, simplifiedExplanation]);

  // Read question aloud when step changes if autoSpeak is enabled
  useEffect(() => {
    if (autoSpeakEnabled && questionText && !showSummary && !pendingConfirmation) {
      say(questionText);
    }
  }, [index, questionText, autoSpeakEnabled, showSummary, pendingConfirmation, say]);

  // Clean up simplified explanation when step changes
  useEffect(() => {
    setSimplifiedExplanation(null);
    setTextInput('');
    setStateSearch('');
  }, [index]);

  /** Formats a raw value into a human-readable display string */
  const formatDisplayValue = useCallback(
    (stepDef: OnboardingStep, val: string | number): string => {
      if (stepDef.id === 'language') {
        const lang = languages.find((l) => l.code === val);
        return lang ? `${lang.nativeName} (${lang.name})` : String(val);
      }
      if (stepDef.id === 'age') {
        return `${val} ${t('onboarding.agePlaceholder') || 'years'}`;
      }
      if (stepDef.choices) {
        const match = stepDef.choices.find((c) => c.value === val);
        if (match) return labelFor(match);
      }
      return String(val);
    },
    [languages, labelFor, t]
  );

  /** Prompts confirmation for an extracted or chosen value */
  const promptConfirmation = (val: string | number) => {
    if (!step) return;

    if (step.id === 'language') {
      // Language switches immediately
      i18n.changeLanguage(String(val));
      setAnswer('language', val);
      next();
      return;
    }

    const fieldLabel = t(step.questionKey);
    const displayVal = formatDisplayValue(step, val);

    setPendingConfirmation({
      stepId: step.id,
      fieldLabel,
      rawValue: val,
      displayValue: displayVal
    });

    if (autoSpeakEnabled) {
      const confirmPrompt = t('onboarding.aiUnderstoodPrompt', {
        field: fieldLabel,
        value: displayVal
      });
      say(confirmPrompt);
    }
  };

  /** Confirms the pending value and moves to the next question */
  const confirmPendingValue = () => {
    if (!pendingConfirmation || !step) return;
    setAnswer(pendingConfirmation.stepId, pendingConfirmation.rawValue);
    setPendingConfirmation(null);

    if (isLast) {
      setShowSummary(true);
    } else {
      next();
    }
  };

  /** Rejects the pending value and allows re-answering */
  const rejectPendingValue = () => {
    setPendingConfirmation(null);
    inputRef.current?.focus();
  };

  /** Direct button selection (choice questions) */
  const handleSelectChoice = (val: string) => {
    promptConfirmation(val);
  };

  /** Voice input handler with smart derivation */
  const handleVoiceInput = (spoken: string) => {
    if (!step) return;

    if (step.id === 'language') {
      const heard = spoken.toLowerCase();
      const matched = languages.find(
        (l) =>
          heard.includes(l.name.toLowerCase()) ||
          heard.includes(l.nativeName.toLowerCase()) ||
          heard.includes(l.code.toLowerCase())
      );
      if (matched) {
        i18n.changeLanguage(matched.code);
        setAnswer('language', matched.code);
        next();
      }
      return;
    }

    if (step.id === 'state') {
      const matchedState = matchSpokenState(spoken);
      if (matchedState) {
        promptConfirmation(matchedState);
      } else {
        setTextInput(spoken);
      }
      return;
    }

    if (step.id === 'age') {
      const parsed = parseSpokenAgeOrBirthYear(spoken);
      if (parsed !== null) {
        promptConfirmation(parsed.age);
      } else {
        setTextInput(spoken);
      }
      return;
    }

    if (step.choices) {
      const matched = matchSpokenChoice(spoken, step.choices, labelMap);
      if (matched) {
        promptConfirmation(matched);
      } else {
        setTextInput(spoken);
      }
      return;
    }

    // Default text/name
    if (spoken.trim()) {
      promptConfirmation(spoken.trim());
    }
  };

  /** Manual text submission */
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !step) return;

    if (step.id === 'age') {
      const parsed = parseSpokenAgeOrBirthYear(textInput);
      if (parsed !== null) {
        promptConfirmation(parsed.age);
      }
      return;
    }

    promptConfirmation(textInput.trim());
    setTextInput('');
  };

  /** Provide simpler rephrased explanation */
  const handleExplainSimpler = () => {
    if (!step) return;
    let simpleText = '';
    switch (step.id) {
      case 'state':
        simpleText = 'Government schemes differ by state. Tell us where you currently live so we show schemes you can actually claim in your area.';
        break;
      case 'age':
        simpleText = 'Certain schemes are for youth, children, or senior citizens. You can say your age or the year you were born.';
        break;
      case 'occupation':
        simpleText = 'Are you a farmer, student, small business owner, or looking for a job? Tell us what you do so we find schemes designed for your work.';
        break;
      case 'income':
        simpleText = 'Many government benefits have an income limit. Choose the range that best matches your family total yearly income.';
        break;
      case 'category':
        simpleText = 'Several schemes have reserved quotas or fee waivers for specific social categories (OBC, SC, ST, EWS). You can skip this if you prefer.';
        break;
      default:
        simpleText = noteText || 'This detail helps BharatAssist AI filter out schemes you might not qualify for.';
    }
    setSimplifiedExplanation(simpleText);
    if (autoSpeakEnabled) {
      say(simpleText);
    }
  };

  /** Final save and transition */
  const handleFinalSave = async () => {
    try {
      await save.mutateAsync();
      navigate(destination, { replace: true });
    } catch {
      /* Handled by mutation error state */
    }
  };

  /** Skip all */
  const handleSkipAll = () => {
    markOnboardingSkipped();
    navigate(destination, { replace: true });
  };

  // Filtered states for state picker
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return STATES.slice(0, 8);
    const q = stateSearch.toLowerCase();
    return STATES.filter((s) => s.toLowerCase().includes(q));
  }, [stateSearch]);

  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-paper">
      {/* Header Bar */}
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-ink-2 hover:text-ink"
          >
            <Link to="/welcome" state={{ from: destination }}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sanction/10 px-3 py-1 font-mono text-micro font-semibold text-sanction">
              <Sparkles className="h-3.5 w-3.5" />
              AI Assistant Setup
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (autoSpeakEnabled && isSpeaking) stop();
                setAutoSpeakEnabled(!autoSpeakEnabled);
              }}
              title={autoSpeakEnabled ? 'Mute auto-speech' : 'Enable auto-speech'}
              aria-label={autoSpeakEnabled ? 'Mute auto-speech' : 'Enable auto-speech'}
              className="text-ink-2 hover:text-ink"
            >
              {autoSpeakEnabled ? (
                <Volume2 className="h-4 w-4 text-sanction" />
              ) : (
                <VolumeX className="h-4 w-4 text-ink-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelpModal(true)}
              className="gap-1.5 text-xs text-ink-2 hover:text-sanction"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{t('onboarding.needHelp')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Conversation Container */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-4 sm:p-6">
        {/* Progress indicator */}
        {!showSummary && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-ink-3">
              <span>
                {t('onboarding.stepOf', { current: index + 1, total })}
              </span>
              <span>{Math.round(((index + 1) / total) * 100)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-rule">
              <div
                className="h-full bg-sanction transition-all duration-300"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* -------------------- Conversation Area -------------------- */}
        {!showSummary ? (
          <div className="flex-1 space-y-5">
            {/* AI Message Bubble */}
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sanction text-white shadow-card">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-tl-none border border-rule bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-[1.125rem] font-semibold leading-snug text-ink sm:text-[1.25rem]">
                    {questionText}
                  </h2>
                  <SpeakButton text={questionText} />
                </div>

                {noteText && (
                  <p className="mt-1.5 text-[0.875rem] text-ink-2">
                    {noteText}
                  </p>
                )}

                {step?.id === 'age' && (
                  <p className="mt-2 text-micro text-ink-3">
                    💡 {t('onboarding.birthYearHint')}
                  </p>
                )}

                {/* Simplified explanation card */}
                {simplifiedExplanation && (
                  <div className="mt-3 rounded-lg border border-sanction-edge bg-sanction-tint p-3 text-[0.875rem] text-sanction">
                    <p className="font-medium">Simple explanation:</p>
                    <p className="mt-1 text-ink">{simplifiedExplanation}</p>
                  </div>
                )}

                {/* Action buttons inside question */}
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-rule/50">
                  <button
                    type="button"
                    onClick={handleExplainSimpler}
                    className="inline-flex items-center gap-1 text-micro font-medium text-sanction underline-offset-4 hover:underline"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('onboarding.rephraseSimpler')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="inline-flex items-center gap-1 text-micro font-medium text-ink-3 hover:text-ink"
                  >
                    <HelpCircle className="h-3 w-3" />
                    {t('onboarding.needHelp')}
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmation Interstitial State */}
            {pendingConfirmation && (
              <div className="rounded-xl border-2 border-sanction bg-sanction-tint/50 p-5 shadow-card animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sanction text-white">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-[1rem] font-semibold text-ink">
                      {t('onboarding.aiUnderstoodPrompt', {
                        field: pendingConfirmation.fieldLabel,
                        value: pendingConfirmation.displayValue
                      })}
                    </p>
                    <p className="mt-1 text-xs text-ink-2">
                      Please confirm if this is what you meant before we continue.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={confirmPendingValue}
                        className="bg-sanction text-white hover:bg-sanction/90"
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        {t('onboarding.confirmYes')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={rejectPendingValue}
                        className="border-rule-strong text-ink hover:bg-rule/30"
                      >
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                        {t('onboarding.confirmChange')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- Interactive Input Modes -------------------- */}
            {!pendingConfirmation && step && (
              <div className="space-y-4 pt-2">
                {/* 1. Categorical / Choice Options */}
                {step.kind === 'choice' && step.choices && (
                  <div
                    className={cn(
                      'grid gap-2.5',
                      step.columns === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                    )}
                  >
                    {step.choices.map((choice) => {
                      const Icon = choice.icon;
                      const label = labelFor(choice);
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => handleSelectChoice(choice.value)}
                          className="flex items-center gap-3 rounded-xl border border-rule-strong bg-surface p-3.5 text-left transition-all duration-150 hover:border-sanction hover:bg-sanction-tint hover:shadow-card active:scale-[0.99]"
                        >
                          {Icon ? (
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sanction/10 text-sanction">
                              <Icon className="h-5 w-5" />
                            </div>
                          ) : (
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-rule-strong text-xs font-bold text-ink-3">
                              •
                            </span>
                          )}
                          <span className="font-display text-[0.9375rem] font-semibold text-ink">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. Language Choice */}
                {step.kind === 'language' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => promptConfirmation(l.code)}
                        className={cn(
                          'flex flex-col items-start rounded-xl border p-3.5 text-left transition-all hover:border-sanction hover:shadow-card',
                          i18n.language === l.code
                            ? 'border-sanction bg-sanction-tint'
                            : 'border-rule-strong bg-surface'
                        )}
                      >
                        <span className="font-display text-[1.0625rem] font-bold text-ink">
                          {l.nativeName}
                        </span>
                        <span className="font-mono text-micro text-ink-3">{l.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. State Search / Chips Choice */}
                {step.kind === 'searchChoice' && step.id === 'state' && (
                  <div className="space-y-3 rounded-xl border border-rule bg-surface p-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
                      <Input
                        value={stateSearch}
                        onChange={(e) => setStateSearch(e.target.value)}
                        placeholder={t('onboarding.stateSearchPlaceholder')}
                        className="pl-9 text-[0.9375rem]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filteredStates.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => promptConfirmation(st)}
                          className="rounded-lg border border-rule-strong bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-sanction hover:bg-sanction-tint hover:text-sanction"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Adaptive Input Bar (Voice + Typing Fallback) */}
                <form
                  onSubmit={handleTextSubmit}
                  className="rounded-xl border border-rule-strong bg-surface p-2 shadow-card transition-all focus-within:border-sanction focus-within:ring-2 focus-within:ring-sanction/10"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      type={step.kind === 'number' ? 'number' : 'text'}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={
                        step.placeholderKey
                          ? t(step.placeholderKey)
                          : 'Speak via microphone or type your answer…'
                      }
                      className="border-none bg-transparent shadow-none focus-visible:ring-0 text-[0.9375rem]"
                    />

                    {/* Speech input with visual cue */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <MicButton onResult={handleVoiceInput} />
                      {textInput.trim() && (
                        <Button type="submit" size="sm" className="h-9 px-3">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Micro hint */}
                <p className="text-center text-micro text-ink-3">
                  {t('onboarding.aiSubtitle')}
                </p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        ) : (
          /* -------------------- Profile Summary Screen -------------------- */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-rule bg-surface p-6 shadow-card">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sanction text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-[1.25rem] font-bold text-ink">
                    {t('onboarding.summaryTitle')}
                  </h2>
                  <p className="text-[0.875rem] text-ink-2">
                    {t('onboarding.summaryDesc')}
                  </p>
                </div>
              </div>

              {/* Attributes Sheet */}
              <div className="mt-6 divide-y divide-rule border-y border-rule">
                {steps
                  .filter((s) => s.field && profileDraft[s.field])
                  .map((s) => {
                    const rawVal = profileDraft[s.field!];
                    const displayVal = formatDisplayValue(s, rawVal as any);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between py-3 text-[0.875rem]"
                      >
                        <div>
                          <span className="font-medium text-ink-3 block text-xs">
                            {t(s.questionKey)}
                          </span>
                          <span className="font-semibold text-ink">
                            {displayVal}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowSummary(false);
                            const targetIdx = steps.findIndex((x) => x.id === s.id);
                            if (targetIdx >= 0) {
                              setPendingConfirmation(null);
                            }
                          }}
                          className="text-xs text-sanction hover:bg-sanction/10"
                        >
                          <Edit2 className="mr-1 h-3 w-3" />
                          {t('onboarding.editField')}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              {/* Confirmation Action */}
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  onClick={handleFinalSave}
                  disabled={save.isPending}
                  className="w-full h-11 text-[1rem] font-semibold bg-sanction hover:bg-sanction/90 text-white shadow-card"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('onboarding.saveAndShow')}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowSummary(false)}
                  className="w-full text-ink-2"
                >
                  {t('common.back')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Footer Actions */}
        <div className="mt-8 flex items-center justify-between border-t border-rule pt-4 text-xs text-ink-3">
          {index > 0 && !showSummary ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1 hover:text-ink"
            >
              <ArrowLeft className="h-3 w-3" />
              Previous question
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={handleSkipAll}
            className="hover:text-ink underline-offset-4 hover:underline"
          >
            {t('onboarding.skipAll')}
          </button>
        </div>
      </main>

      {/* -------------------- Assisted Support Modal ("Need Help?") -------------------- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-6 shadow-focus animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ochre/15 text-ochre">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-[1.125rem] font-bold text-ink">
                  {t('onboarding.helpTitle')}
                </h3>
                <p className="text-xs text-ink-2">{t('onboarding.helpDesc')}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-start gap-3 rounded-xl border border-rule bg-paper p-3.5">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-sanction" />
                <div>
                  <p className="font-semibold text-xs text-ink">
                    {t('onboarding.cscOption')}
                  </p>
                  <p className="text-micro text-ink-3">
                    Visit any official Gram Panchayat Seva Kendra or CSC kiosk for guided operator assistance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-rule bg-paper p-3.5">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-sanction" />
                <div>
                  <p className="font-semibold text-xs text-ink">
                    {t('onboarding.volunteerOption')}
                  </p>
                  <p className="text-micro text-ink-3">
                    Contact your local Asha worker, Gram Sevak, or village volunteer.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-rule bg-paper p-3.5">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-seal" />
                <div>
                  <p className="font-semibold text-xs text-ink">
                    {t('onboarding.helplineOption')}
                  </p>
                  <p className="text-micro text-ink-3">
                    Toll-free 24x7 voice support for government welfare entitlements.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHelpModal(false)}
                className="w-full"
              >
                {t('onboarding.closeHelp')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
