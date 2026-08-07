import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { INCOME_BANDS, SEGMENTS, STATES } from '../lib/taxonomy';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/utils';

interface QuickMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUESTIONS = [
  { id: 'state', title: 'Where do you live?', hint: 'State decides which schemes you can claim.' },
  { id: 'segment', title: 'Which describes you best?', hint: 'Pick the one closest to your situation.' },
  {
    id: 'income',
    title: 'Roughly what does your household earn in a year?',
    hint: 'Most schemes have an income ceiling. You can skip this.'
  }
] as const;

/**
 * The three-question entry path from the landing page (PRD §11.1). It sets
 * search filters rather than asking for anything identifying — no account,
 * nothing stored.
 */
export const QuickMatchDialog: React.FC<QuickMatchDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(0);
  const [state, setState] = useState('');
  const [segment, setSegment] = useState('');
  const [income, setIncome] = useState('');

  const reset = () => {
    setStep(0);
    setState('');
    setSegment('');
    setIncome('');
  };

  const finish = () => {
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (segment) params.set('segment', segment);
    if (income) params.set('incomeBand', income);
    onOpenChange(false);
    reset();

    // The answers become search filters. A guest goes through the door
    // first, carrying those filters, so signing in lands on their results.
    const target = `/search?${params.toString()}`;
    if (isAuthenticated) navigate(target);
    else navigate('/login', { state: { from: target } });
  };

  const canAdvance = step === 0 ? Boolean(state) : step === 1 ? Boolean(segment) : true;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <p className="register">
            Question {step + 1} of {QUESTIONS.length}
          </p>
          <DialogTitle>{QUESTIONS[step].title}</DialogTitle>
          <DialogDescription>{QUESTIONS[step].hint}</DialogDescription>
        </DialogHeader>

        {/* Progress: three marks, filled as you go. */}
        <div className="flex gap-1.5" aria-hidden>
          {QUESTIONS.map((q, i) => (
            <span
              key={q.id}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-sanction' : 'bg-rule'
              )}
            />
          ))}
        </div>

        <div className="min-h-[11rem] py-1">
          {step === 0 && (
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t('profile.chooseState')} />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {step === 1 && (
            <ul className="grid grid-cols-2 gap-2">
              {SEGMENTS.map((s) => {
                const Icon = s.icon;
                const selected = segment === s.slug;
                return (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => setSegment(s.slug)}
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-[0.875rem] font-medium transition-colors',
                        selected
                          ? 'border-sanction bg-sanction-tint text-sanction'
                          : 'border-rule-strong text-ink-2 hover:border-ink-4 hover:text-ink'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                      <span className="truncate">{t(s.labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {step === 2 && (
            <ul className="space-y-2">
              {INCOME_BANDS.map((band) => {
                const selected = income === band.slug;
                return (
                  <li key={band.slug}>
                    <button
                      type="button"
                      onClick={() => setIncome(band.slug)}
                      aria-pressed={selected}
                      className={cn(
                        'w-full rounded-md border px-3.5 py-2.5 text-left text-[0.875rem] font-medium transition-colors',
                        selected
                          ? 'border-sanction bg-sanction-tint text-sanction'
                          : 'border-rule-strong text-ink-2 hover:border-ink-4 hover:text-ink'
                      )}
                    >
                      {t(band.labelKey)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hair-top flex items-center justify-between gap-3 pt-4">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button variant="ghost" onClick={finish}>
                {t('common.skip')}
              </Button>
            )}
            <Button
              onClick={() => (step === QUESTIONS.length - 1 ? finish() : setStep(step + 1))}
              disabled={!canAdvance}
            >
              {step === QUESTIONS.length - 1 ? 'Show my schemes' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
