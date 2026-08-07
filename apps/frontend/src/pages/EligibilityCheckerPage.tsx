import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ListChecks,
  RotateCcw,
  Check
} from 'lucide-react';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { cn } from '../lib/utils';

export interface QuestionItem {
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

export interface QuestionsResponse {
  schemeId: string;
  schemeName: string;
  questions: QuestionItem[];
}

export interface AlternativeRecommendation {
  schemeId: string;
  schemeName: string;
  reasonRecommended: string;
  matchedCriteria: string[];
}

export interface EvaluateResponse {
  schemeId: string;
  schemeName: string;
  status: 'eligible' | 'partially_eligible' | 'not_eligible';
  reasons: string[];
  missingRequirements: string[];
  alternativeSchemes: AlternativeRecommendation[];
}

/** Person 3's Recommendation Engine: cross-recommendations after a positive result. */
interface CrossRecommendation {
  scheme: { slug: string; name: string; department: string; benefitSummary: string };
  status: 'eligible' | 'partially_eligible';
  matchedCriteria: string[];
}

export const EligibilityCheckerPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = searchParams.get('scheme') ?? '';

  const { slugs } = useSavedSchemes();
  const { schemes: savedSchemes } = useSchemeRecords(slugs);

  // Form State
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [evalResult, setEvalResult] = useState<EvaluateResponse | null>(null);

  // Fetch Questions
  const {
    data: questionsData,
    isLoading: loadingQuestions,
    isError: errorQuestions
  } = useQuery<QuestionsResponse>({
    queryKey: ['eligibility-questions', slug],
    queryFn: async () => {
      const res = await apiClient.get(`/eligibility/${slug}/questions`);
      return res.data?.data;
    },
    enabled: Boolean(slug)
  });

  // Pre-fill answers when questions arrive
  useEffect(() => {
    if (questionsData?.questions) {
      const initialAnswers: Record<string, any> = {};
      questionsData.questions.forEach((q) => {
        if (q.currentValue !== undefined && q.currentValue !== null) {
          initialAnswers[q.field] = q.currentValue;
        }
      });
      setAnswers(initialAnswers);
    }
  }, [questionsData]);

  // Evaluate Answers Mutation
  const evaluateMutation = useMutation<EvaluateResponse, Error, Record<string, any>>({
    mutationFn: async (submittedAnswers) => {
      const res = await apiClient.post(`/eligibility/${slug}/evaluate`, {
        answers: submittedAnswers
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      setEvalResult(data);
    }
  });

  // Person 3's Recommendation Engine: "Because you're eligible for X, you may
  // also qualify for Y" — only ever queried once a real, stored positive
  // result exists for this scheme (the backend re-checks this itself too).
  const { data: crossRecs } = useQuery<CrossRecommendation[]>({
    queryKey: ['recommendations-cross', slug, evalResult?.status],
    queryFn: async () => {
      const res = await apiClient.get(`/recommendations/cross/${slug}`);
      return res.data?.data?.recommendations ?? [];
    },
    enabled: Boolean(evalResult && evalResult.status !== 'not_eligible'),
    staleTime: 60 * 1000
  });

  const handleAnswerChange = (field: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (!questionsData) return;
    if (currentStep < questionsData.questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      evaluateMutation.mutate(answers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const resetWizard = () => {
    setEvalResult(null);
    setCurrentStep(0);
  };

  // 1. No Scheme Selected - Picker Screen
  if (!slug) {
    return (
      <PageBody>
        <PageHeader
          eyebrow={t('eligibility.ui.eyebrow')}
          title={t('eligibility.ui.title')}
          description={t('eligibility.ui.desc')}
        />
        <div className="mt-8">
          {savedSchemes.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t('eligibility.ui.noScheme')}
              description={t('eligibility.ui.noScheme')}
              action={
                <Button asChild>
                  <Link to="/search">{t('common.findSchemes')}</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <h2 className="register text-ink-2">{t('eligibility.ui.selectScheme')}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {savedSchemes.map((s) => (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ scheme: s.slug })}
                      className="flex w-full flex-col justify-between rounded-lg border border-rule bg-surface p-5 text-left transition-colors hover:border-sanction hover:bg-sanction-tint/30"
                    >
                      <span className="font-display text-[1rem] font-semibold text-ink">
                        {s.name}
                      </span>
                      <span className="mt-2 register text-ink-3">
                        Issued by {s.department}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PageBody>
    );
  }

  // 2. Loading State
  if (loadingQuestions) {
    return (
      <PageBody>
        <LoadingState message={t('eligibility.ui.loadingQuestions')} rows={3} />
      </PageBody>
    );
  }

  // 3. Error or Not Found
  if (errorQuestions || !questionsData) {
    return (
      <PageBody>
        <EmptyState
          title={t('eligibility.ui.questionsFailed')}
          description={t('eligibility.ui.questionsFailedDesc')}
          action={
            <Button variant="outline" asChild>
              <Link to="/search">{t('schemeDetails.backToSearch')}</Link>
            </Button>
          }
        />
      </PageBody>
    );
  }

  const questions = questionsData.questions;

  // 4. Evaluation Outcome Screen
  if (evalResult) {
    const isEligible = evalResult.status === 'eligible';
    const isPartial = evalResult.status === 'partially_eligible';

    return (
      <PageBody>
        <Link
          to={`/schemes/${slug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {evalResult.schemeName}
        </Link>

        {/* Outcome Header Banner */}
        <div
          className={cn(
            'rounded-xl border p-6 text-balance',
            isEligible
              ? 'border-sanction-edge bg-sanction-tint text-sanction-deep'
              : isPartial
                ? 'border-ochre-edge bg-ochre-tint text-ochre'
                : 'border-rose-300 bg-rose-50 text-rose-900'
          )}
        >
          <div className="flex items-center gap-3">
            {isEligible ? (
              <CheckCircle2 className="h-7 w-7 text-sanction shrink-0" />
            ) : isPartial ? (
              <AlertTriangle className="h-7 w-7 text-ochre shrink-0" />
            ) : (
              <XCircle className="h-7 w-7 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="register uppercase tracking-wider text-xs font-bold">
                {isEligible ? 'Eligible' : isPartial ? 'Partially Eligible' : 'Not Eligible'}
              </span>
              <h1 className="font-display text-2xl font-bold">
                {isEligible
                  ? `You qualify for ${evalResult.schemeName}`
                  : isPartial
                    ? `You partially meet requirements for ${evalResult.schemeName}`
                    : `You do not currently qualify for ${evalResult.schemeName}`}
              </h1>
            </div>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Passed Criteria */}
          {evalResult.reasons.length > 0 && (
            <div className="rounded-lg border border-rule bg-surface p-5">
              <h2 className="flex items-center gap-2 font-display text-[1rem] font-semibold text-ink">
                <Check className="h-4 w-4 text-sanction" />
                Matched Requirements ({evalResult.reasons.length})
              </h2>
              <ul className="mt-4 space-y-2.5">
                {evalResult.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[0.875rem] text-ink-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sanction shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing or Unmatched Requirements */}
          {evalResult.missingRequirements.length > 0 && (
            <div className="rounded-lg border border-rule bg-surface p-5">
              <h2 className="flex items-center gap-2 font-display text-[1rem] font-semibold text-ink">
                <AlertTriangle className="h-4 w-4 text-ochre" />
                Unmatched or Missing Criteria ({evalResult.missingRequirements.length})
              </h2>
              <ul className="mt-4 space-y-2.5">
                {evalResult.missingRequirements.map((missing, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[0.875rem] text-ink-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-ochre shrink-0" />
                    <span>{missing}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Alternative Schemes Recommendations */}
        {evalResult.alternativeSchemes && evalResult.alternativeSchemes.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold text-ink">
              {t('eligibility.ui.alternatives')}
            </h2>
            <p className="mt-1 text-[0.875rem] text-ink-2">
              {t('eligibility.ui.alternativesDesc')}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {evalResult.alternativeSchemes.map((alt) => (
                <div
                  key={alt.schemeId}
                  className="flex flex-col justify-between rounded-lg border border-rule bg-surface p-5 transition-colors hover:border-sanction-edge"
                >
                  <div>
                    <h3 className="font-display text-[1rem] font-semibold text-ink">
                      {alt.schemeName}
                    </h3>
                    <p className="mt-2 text-[0.875rem] font-medium text-sanction">
                      {alt.reasonRecommended}
                    </p>
                    {alt.matchedCriteria.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {alt.matchedCriteria.slice(0, 2).map((m, i) => (
                          <li key={i} className="text-micro text-ink-3 truncate">
                            • {m}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2 pt-2 border-t border-rule">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/eligibility?scheme=${alt.schemeId}`}>{t('schemeDetails.checkEligibility')}</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/schemes/${alt.schemeId}`}>{t('eligibility.ui.viewScheme')}</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cross-recommendations — Person 3's Recommendation Engine, only
            surfaced once this result is genuinely positive */}
        {crossRecs && crossRecs.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold text-ink">
              Because you {isEligible ? 'qualify' : 'may qualify'} for {evalResult.schemeName}
            </h2>
            <p className="mt-1 text-[0.875rem] text-ink-2">
              Your profile was checked, deterministically, against these schemes too — you may
              qualify for them as well.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {crossRecs.map((rec) => (
                <div
                  key={rec.scheme.slug}
                  className="flex flex-col justify-between rounded-lg border border-rule bg-surface p-5 transition-colors hover:border-sanction-edge"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-[1rem] font-semibold text-ink">
                        {rec.scheme.name}
                      </h3>
                      <span
                        className={cn(
                          'register-strong shrink-0',
                          rec.status === 'eligible' ? 'text-sanction' : 'text-ochre'
                        )}
                      >
                        {rec.status === 'eligible' ? 'Eligible' : 'Partially eligible'}
                      </span>
                    </div>
                    <p className="mt-2 text-[0.875rem] text-ink-2">{rec.scheme.benefitSummary}</p>
                    {rec.matchedCriteria.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {rec.matchedCriteria.slice(0, 2).map((m, i) => (
                          <li key={i} className="text-micro text-ink-3 truncate">
                            • {m}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2 pt-2 border-t border-rule">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/eligibility?scheme=${rec.scheme.slug}`}>{t('schemeDetails.checkEligibility')}</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/schemes/${rec.scheme.slug}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
          <Button variant="outline" onClick={resetWizard}>
            <RotateCcw className="h-4 w-4" />
            {t('eligibility.ui.startOver')}
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to={`/checklist?scheme=${slug}`}>
                <ListChecks className="h-4 w-4" />
                {t('eligibility.ui.viewChecklist')}
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/schemes/${slug}`}>{t('eligibility.ui.viewScheme')}</Link>
            </Button>
          </div>
        </div>
      </PageBody>
    );
  }

  // 5. Dynamic Question Wizard Screen
  const currentQ = questions[currentStep];
  const isLast = currentStep === questions.length - 1;
  const currentAnswer = answers[currentQ.field] ?? '';

  return (
    <PageBody>
      <Link
        to={`/schemes/${slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {questionsData.schemeName}
      </Link>

      <PageHeader
        eyebrow={t('eligibility.ui.eyebrow')}
        title={questionsData.schemeName}
        description={`Answer ${questions.length} scheme questions to verify your eligibility.`}
      />

      {/* Progress Bar */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule">
          <div
            className="h-full rounded-full bg-sanction transition-[width] duration-300"
            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="register-strong shrink-0">
          Question {currentStep + 1} of {questions.length}
        </span>
      </div>

      {/* Question Card wrapped in <form> for keyboard accessibility */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleNext();
        }}
        className="mt-8 rounded-xl border border-rule bg-surface p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="register uppercase tracking-wider text-xs text-ink-3">
            Field: {currentQ.field}
          </span>
          {currentQ.prefilled && (
            <span className="register-strong inline-flex items-center gap-1 rounded-md bg-sanction-tint px-2.5 py-1 text-micro text-sanction">
              <Check className="h-3 w-3" />
              {t('eligibility.ui.prefilled')}
            </span>
          )}
        </div>

        <h2 className="mt-3 font-display text-xl font-semibold text-ink">
          {t(currentQ.questionKey, { defaultValue: currentQ.question })}
        </h2>

        {/* Input Rendering */}
        <div className="mt-6 max-w-md">
          {currentQ.type === 'select' && currentQ.options ? (
            <Select
              value={String(currentAnswer)}
              onValueChange={(val) => handleAnswerChange(currentQ.field, val)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t('eligibility.ui.selectOption')} />
              </SelectTrigger>
              <SelectContent>
                {currentQ.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : currentQ.type === 'number' ? (
            <Input
              type="number"
              value={currentAnswer}
              onChange={(e) =>
                handleAnswerChange(
                  currentQ.field,
                  e.target.value ? Number(e.target.value) : ''
                )
              }
              placeholder={t('eligibility.ui.enterNumber')}
              className="h-11"
            />
          ) : (
            <Input
              type="text"
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(currentQ.field, e.target.value)}
              placeholder={t('eligibility.ui.enterDetails')}
              className="h-11"
            />
          )}
        </div>

        {/* Card Actions */}
        <div className="mt-8 flex items-center justify-between border-t border-rule pt-6">
          {currentStep > 0 ? (
            <Button type="button" variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
              {t('eligibility.ui.previous')}
            </Button>
          ) : (
            <span />
          )}

          <Button
            type="submit"
            disabled={evaluateMutation.isPending}
          >
            {evaluateMutation.isPending
              ? 'Evaluating...'
              : isLast
                ? 'Check Eligibility'
                : 'Next Question'}
            {!evaluateMutation.isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </PageBody>
  );
};
