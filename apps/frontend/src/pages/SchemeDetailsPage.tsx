import { useTranslation } from 'react-i18next';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  ExternalLink,
  GitCompare,
  ListChecks,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PageBody } from '../components/layout/PageHeader';
import { LevelMark, StatusMark, VerificationStamp } from '../components/scheme/RecordMarks';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/skeleton';
import { SpeakButton } from '../voice';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { useLiveTranslation } from '../translation';
import { isValidGovDomain } from '../lib/govAllowlist';
import { benefitLabelKey, segmentLabelKey } from '../lib/taxonomy';
import { formatDate, daysUntil } from '../lib/format';
import { cn } from '../lib/utils';

/** A labelled row in the record sheet. */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid gap-1 py-3.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
    <dt className="register pt-0.5">{label}</dt>
    <dd className="text-[0.9375rem] leading-relaxed text-ink">{children}</dd>
  </div>
);

/** Sections Person 2 fills in. Say what is coming, not "no data". */
const PendingSection: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="rounded-lg border border-dashed border-rule-strong bg-surface p-6">
    <h3 className="font-display text-[0.9375rem] font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 max-w-xl text-[0.875rem] leading-relaxed text-ink-2">{body}</p>
  </div>
);

export const SchemeDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const { idOrSlug = '' } = useParams();
  const { isSaved, toggle } = useSavedSchemes();

  const { data: scheme, isLoading, isError } = useQuery<Scheme>({
    queryKey: ['scheme', idOrSlug],
    queryFn: async () => {
      const res = await apiClient.get(`/schemes/${idOrSlug}`);
      return res.data?.data;
    }
  });

  const { data: guidanceData } = useQuery({
    queryKey: ['guidance', idOrSlug],
    queryFn: async () => {
      const res = await apiClient.get(`/guidance/${idOrSlug}`);
      return res.data?.data;
    },
    enabled: Boolean(scheme)
  });

  /*
   * The record's prose, in the reader's language.
   *
   * The API already returns stored translations where they exist; this
   * covers the case they cannot — a scheme added or amended since the last
   * `translate:schemes` run. One batched request per record, cached for the
   * session, and it hands back the English unchanged when the server has no
   * translation provider configured.
   *
   * Declared here, above the loading and error returns, because it is a
   * hook: calling it further down would change how many hooks this
   * component runs between renders.
   */
  const { texts: prose } = useLiveTranslation(
    [
      scheme?.fullDescription || scheme?.shortDescription || '',
      scheme?.benefitSummary || '',
      scheme?.eligibilitySummaryPlain || ''
    ],
    { context: 'A government scheme record shown to a citizen', enabled: Boolean(scheme) }
  );
  const [description, benefitSummary, eligibilityPlain] = prose;

  if (isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-6 h-5 w-48" />
        <Skeleton className="mt-4 h-10 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-10 h-64 w-full" />
      </PageBody>
    );
  }

  if (isError || !scheme) {
    return (
      <PageBody>
        <EmptyState
          title={t('schemeDetails.notFound')}
          description={t('schemeDetails.notFoundDesc')}
          action={
            <Button variant="outline" asChild>
              <Link to="/search">{t('schemeDetails.searchRegister')}</Link>
            </Button>
          }
        />
      </PageBody>
    );
  }

  const saved = isSaved(scheme.slug);
  const portalIsOfficial = isValidGovDomain(scheme.officialPortalUrl);
  const left = daysUntil(scheme.deadline);
  const rules = scheme.eligibilityRules ?? {};

  return (
    <PageBody>
      <Link
        to="/search"
        className="mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('schemeDetails.backToSearch')}
      </Link>

      {/*
        Three grid children, explicitly placed.

        Desktop is unchanged: the record fills the left column across both
        rows, the actions rail sits sticky on the right. But because the
        heading and the tabs are separate children, the single-column phone
        layout can put the rail *between* them — so "Check eligibility" and
        "Save" appear directly under the benefit summary instead of after
        four tabs' worth of scrolling. Nothing is duplicated or hidden; the
        same three blocks are simply ordered for the screen.
      */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:gap-10">
        {/* ------------------------- The record ------------------------- */}
        <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <LevelMark level={scheme.level} state={scheme.state} />
            <StatusMark scheme={scheme} />
          </div>

          <h1 className="mt-4 text-balance font-display text-[2rem] font-semibold leading-[1.12] tracking-[-0.025em] text-ink">
            {scheme.name}
          </h1>

          <p className="mt-3 flex items-center gap-2 text-[0.9375rem] text-ink-2">
            <Building2 className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.7} />
            {scheme.department}
          </p>

          {/* The answer most people came for */}
          <div className="mt-6 rounded-lg border border-sanction-edge bg-sanction-tint p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="register text-sanction">{t('record.youReceive')}</p>
              {/* The one line most citizens came for — readable, or hearable. */}
              <SpeakButton
                text={`${scheme.name}. ${benefitSummary || t(benefitLabelKey(scheme.benefitType))}`}
              />
            </div>
            <p className="mt-1.5 font-display text-xl font-semibold leading-snug text-sanction-deep">
              {benefitSummary || t(benefitLabelKey(scheme.benefitType))}
            </p>
            {scheme.deadline && (
              <p className="mt-3 flex items-center gap-2 text-[0.875rem] text-sanction-deep/80">
                <CalendarClock className="h-4 w-4 shrink-0" strokeWidth={1.7} />
                {left !== null && left >= 0
                  ? `Applications close ${formatDate(scheme.deadline)} — ${left} day${left === 1 ? '' : 's'} left`
                  : `Closed on ${formatDate(scheme.deadline)}`}
              </p>
            )}
          </div>
        </div>

        {/* ---------------- The record, in detail ---------------- */}
        <div className="order-3 min-w-0 lg:col-start-1 lg:row-start-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">{t('schemeDetails.overview')}</TabsTrigger>
              <TabsTrigger value="eligibility">{t('schemeDetails.eligibility')}</TabsTrigger>
              <TabsTrigger value="documents">{t('schemeDetails.documents')}</TabsTrigger>
              <TabsTrigger value="apply">{t('schemeDetails.howToApply')}</TabsTrigger>
            </TabsList>

            {/* ---- Overview ---- */}
            <TabsContent value="overview">
              <p className="text-[1rem] leading-[1.7] text-ink-2 text-pretty">
                {description}
              </p>

              <dl className="mt-8 divide-y divide-rule border-y border-rule">
                <Field label={t('schemeDetails.issuedBy')}>{scheme.department}</Field>
                <Field label={t('schemeDetails.government')}>
                  {scheme.level === 'central' ? 'Central' : `State — ${scheme.state}`}
                </Field>
                <Field label={t('search.segment')}>
                  {scheme.targetSegments?.length
                    ? scheme.targetSegments.map((s) => t(segmentLabelKey(s))).join(', ')
                    : 'Open to all citizens'}
                </Field>
                <Field label={t('compare.benefitType')}>{t(benefitLabelKey(scheme.benefitType))}</Field>
                <Field label={t('schemeDetails.howToApply')}>
                  {scheme.applicationMode === 'both'
                    ? 'Online or in person'
                    : scheme.applicationMode === 'online'
                      ? 'Online only'
                      : 'In person only'}
                </Field>
                <Field label={t('compare.deadline')}>
                  {scheme.deadline ? formatDate(scheme.deadline) : 'No closing date — open all year'}
                </Field>
                <Field label={t('schemeDetails.source')}>
                  <span className="font-mono text-[0.875rem]">{scheme.sourceRef || '—'}</span>
                </Field>
              </dl>
            </TabsContent>

            {/* ---- Eligibility ---- */}
            <TabsContent value="eligibility">
              {eligibilityPlain ? (
                <p className="text-[1rem] leading-[1.7] text-ink-2 text-pretty">
                  {eligibilityPlain}
                </p>
              ) : (
                <p className="text-[1rem] leading-[1.7] text-ink-2">
                  The plain-language summary for this scheme has not been written yet. The
                  conditions recorded on the official notification are listed below.
                </p>
              )}

              <dl className="mt-8 divide-y divide-rule border-y border-rule">
                {rules.state?.length ? (
                  <Field label={t('schemeDetails.mustLiveIn')}>{rules.state.join(', ')}</Field>
                ) : null}
                {(rules.ageMin || rules.ageMax) && (
                  <Field label={t('profile.age')}>
                    {rules.ageMin && rules.ageMax
                      ? `Between ${rules.ageMin} and ${rules.ageMax} years`
                      : rules.ageMin
                        ? `${rules.ageMin} years or older`
                        : `Up to ${rules.ageMax} years`}
                  </Field>
                )}
                {rules.incomeMax ? (
                  <Field label={t('search.income')}>
                    Up to ₹{Number(rules.incomeMax).toLocaleString('en-IN')} a year
                  </Field>
                ) : null}
                {rules.genderRestriction ? (
                  <Field label={t('profile.gender')}>{rules.genderRestriction}</Field>
                ) : null}
                {rules.occupationCategory?.length ? (
                  <Field label={t('profile.occupation')}>{rules.occupationCategory.join(', ')}</Field>
                ) : null}
                {rules.categoryRestriction?.length ? (
                  <Field label={t('profile.category')}>{rules.categoryRestriction.join(', ')}</Field>
                ) : null}
              </dl>

              <div className="mt-8 rounded-lg border border-sanction-edge bg-sanction-tint p-6">
                <h3 className="font-display text-[0.9375rem] font-semibold text-sanction-deep">{t('schemeDetails.checkQualification')}</h3>
                <p className="mt-1.5 max-w-xl text-[0.875rem] leading-relaxed text-sanction-deep/80">
                  {t('schemeDetails.checkQualificationDesc')}
                </p>
                <Button className="mt-4" asChild>
                  <Link to={`/eligibility?scheme=${scheme.slug}`}>
                    <Sparkles className="h-4 w-4" />
                    {t('schemeDetails.startCheck')}
                  </Link>
                </Button>
              </div>
            </TabsContent>

            {/* ---- Documents ---- */}
            <TabsContent value="documents">
              {scheme.requiredDocuments?.length ? (
                <>
                  <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                    Everything the official application asks for. Anything you do not have yet
                    carries a note on where to obtain it.
                  </p>
                  <ul className="mt-6 divide-y divide-rule border-y border-rule">
                    {scheme.requiredDocuments.map((doc) => (
                      <li key={doc.label} className="py-4">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-display text-[0.9375rem] font-semibold text-ink">
                            {doc.label}
                          </span>
                          <span
                            className={
                              doc.mandatory
                                ? 'register-strong text-seal'
                                : 'register text-ink-3'
                            }
                          >
                            {doc.mandatory ? 'Required' : 'If applicable'}
                          </span>
                        </div>
                        {doc.howToObtain && (
                          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
                            {doc.howToObtain}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <PendingSection
                  title={t('schemeDetails.noDocs')}
                  body="This scheme's notification has not been parsed for its document requirements. The official portal lists them in the meantime."
                />
              )}
            </TabsContent>

            <TabsContent value="apply">
              {/* Ready to Apply Status Banner */}
              {guidanceData && (
                <div
                  className={cn(
                    'mb-6 rounded-lg border p-5',
                    guidanceData.readyToApply
                      ? 'border-sanction-edge bg-sanction-tint text-sanction-deep'
                      : 'border-ochre-edge bg-ochre-tint text-ochre'
                  )}
                >
                  <p className="register uppercase text-xs font-bold">{t('schemeDetails.readiness')}</p>
                  <h4 className="font-display text-[1rem] font-bold mt-1">
                    {guidanceData.readyToApply
                      ? 'Ready to Apply — Form guidance and official portal verified'
                      : guidanceData.notes || 'Application portal unverified or guidance incomplete'}
                  </h4>
                </div>
              )}

              {/* Field Guidance */}
              {(guidanceData?.fieldByFieldGuidance?.length || scheme.applicationFields?.length) ? (
                <>
                  <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                    {t('schemeDetails.walkthroughDesc')}
                  </p>
                  <ol className="mt-6 divide-y divide-rule border-y border-rule">
                    {(guidanceData?.fieldByFieldGuidance || scheme.applicationFields || []).map((field: any, i: number) => (
                      <li key={field.fieldName} className="flex gap-4 py-4">
                        <span className="font-mono text-[0.8125rem] text-ink-4">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-[0.9375rem] font-semibold text-ink">
                              {field.fieldName}
                            </p>
                            {!field.mandatory && (
                              <span className="register text-ink-3">{t('schemeDetails.optionalField')}</span>
                            )}
                            {field.prefilledValue && (
                              <span className="register-strong text-micro bg-sanction-tint text-sanction px-2 py-0.5 rounded">
                                Known from profile ({String(field.prefilledValue)})
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-2">
                            {field.instructions}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <PendingSection
                  title={t('schemeDetails.noWalkthrough')}
                  body="The application guidance for this scheme is still being written. The official portal below is the place to apply."
                />
              )}

              {/* Common Mistakes */}
              {(guidanceData?.commonMistakes?.length || scheme.commonMistakes?.length) > 0 && (
                <div className="mt-8 rounded-lg border border-ochre-edge bg-ochre-tint p-5">
                  <p className="flex items-center gap-2 register-strong text-ochre">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {t('schemeDetails.commonMistakes')}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {(guidanceData?.commonMistakes || scheme.commonMistakes || []).map((mistake: string) => (
                      <li key={mistake} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-ink">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ochre" />
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dynamic Terminology Glossary */}
              {guidanceData?.glossary && guidanceData.glossary.length > 0 && (
                <div className="mt-8 rounded-lg border border-rule bg-surface p-5">
                  <h4 className="font-display text-[0.9375rem] font-semibold text-ink">
                    {t('schemeDetails.glossary')}
                  </h4>
                  <dl className="mt-3 space-y-3 divide-y divide-rule">
                    {guidanceData.glossary.map((item: any) => (
                      <div key={item.term} className="pt-3 first:pt-0">
                        <dt className="font-semibold text-[0.875rem] text-ink">{item.term}</dt>
                        <dd className="text-[0.8125rem] text-ink-2 mt-0.5">{item.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ------------------------- Actions rail ------------------------ */}
        {/* Row 1 on a phone (between the heading and the tabs); the full
            right-hand column, sticky, from lg up. */}
        {/*
          `min-w-0` is load-bearing. As a grid item this defaults to
          `min-width: auto`, meaning the track cannot shrink below the
          item's min-content — and this column contains the portal host
          name (`ladakibahin.maharashtra.gov.in`) set in nowrap for
          truncation. Without it that one unbreakable string sets a ~334px
          floor for the whole page, and every screen narrower than that
          scrolls sideways.
        */}
        <aside className="order-2 min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-[4.5rem] lg:h-fit lg:self-start">
          <div className="space-y-3 rounded-lg border border-rule bg-surface p-5">
            <Button className="w-full" asChild>
              <Link to={`/eligibility?scheme=${scheme.slug}`}>
                <Sparkles className="h-4 w-4" />
                {t('schemeDetails.checkEligibility')}
              </Link>
            </Button>

            <Button
              variant={saved ? 'soft' : 'outline'}
              className="w-full"
              onClick={() => toggle(scheme.slug)}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? 'Saved' : 'Save this scheme'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/compare?schemes=${scheme.slug}`}>
                  <GitCompare className="h-4 w-4 text-ink-3" />
                  {t('schemeDetails.addToCompare')}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/assistant?scheme=${scheme.slug}`}>
                  <Sparkles className="h-4 w-4 text-ink-3" />
                  {t('schemeDetails.explainSimpler')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Provenance — the trust claim, stated once, in full. */}
          <div className="mt-4 rounded-lg border border-rule bg-surface p-5">
            <p className="register mb-3">{t('schemeDetails.whereFrom')}</p>
            <VerificationStamp scheme={scheme} />

            {scheme.officialPortalUrl && (
              <div className="mt-4">
                {portalIsOfficial ? (
                  <a
                    href={scheme.officialPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 rounded-md border border-rule-strong p-3 text-[0.875rem] transition-colors hover:border-sanction hover:bg-sanction-tint"
                  >
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.7} />
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">{t('schemeDetails.officialPortal')}</span>
                      <span className="block truncate font-mono text-micro text-ink-3">
                        {scheme.officialPortalUrl.replace(/^https?:\/\//, '')}
                      </span>
                    </span>
                    <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-ink-4" />
                  </a>
                ) : (
                  <p className="rounded-md border border-ochre-edge bg-ochre-tint p-3 text-[0.8125rem] leading-relaxed text-ochre">
                    The portal link on this record is not on a recognised government domain, so we
                    are not linking to it. Search for the scheme on india.gov.in instead.
                  </p>
                )}
              </div>
            )}

            <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-3">
              Spotted something that does not match the official notification?{' '}
              <Link to="/assistant" className="text-sanction underline-offset-4 hover:underline">
                {t('schemeDetails.tellAssistant')}
              </Link>{' '}
              and it gets queued for re-checking.
            </p>
          </div>
        </aside>
      </div>
    </PageBody>
  );
};
