import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ListChecks, Printer } from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { cn } from '../lib/utils';

const KEY = 'bharatassist_checklist';

function readTicks(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * The document checklist for one scheme. Person 2 owns the personalised
 * version that reads the citizen profile; this renders the scheme's recorded
 * requirements and tracks what you already have, on this device.
 */
export const ChecklistPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = searchParams.get('scheme') ?? '';
  const { slugs } = useSavedSchemes();
  const { schemes: savedSchemes } = useSchemeRecords(slugs);

  const [ticks, setTicks] = useState<Record<string, string[]>>(readTicks);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(ticks));
  }, [ticks]);

  const { data: scheme, isLoading } = useQuery<Scheme>({
    queryKey: ['scheme', slug],
    queryFn: async () => {
      const res = await apiClient.get(`/schemes/${slug}`);
      return res.data?.data;
    },
    enabled: Boolean(slug)
  });

  const have = ticks[slug] ?? [];
  const documents = scheme?.requiredDocuments ?? [];
  const missing = documents.filter((d) => !have.includes(d.label));

  const toggleDoc = (label: string) =>
    setTicks((prev) => {
      const current = prev[slug] ?? [];
      return {
        ...prev,
        [slug]: current.includes(label) ? current.filter((l) => l !== label) : [...current, label]
      };
    });

  // No scheme chosen — pick one from the saved list.
  if (!slug) {
    return (
      <PageBody>
        <PageHeader
          eyebrow={t('checklist.eyebrow')}
          title={t('checklist.title')}
          description="Pick a scheme and we'll list exactly what its application asks for, and where to get anything you're missing."
        />
        <div className="mt-8">
          {savedSchemes.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Choose a scheme first"
              description="Open any scheme and select 'Check my eligibility' to start its document checklist."
              action={
                <Button asChild>
                  <Link to="/search">Find schemes</Link>
                </Button>
              }
            />
          ) : (
            <>
              <h2 className="register mb-3">From your saved schemes</h2>
              <ul className="space-y-2">
                {savedSchemes.map((s) => (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ scheme: s.slug })}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-rule bg-surface p-4 text-left transition-colors hover:border-sanction-edge hover:bg-sanction-tint/40"
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-[0.9375rem] font-semibold text-ink">
                          {s.name}
                        </span>
                        <span className="register block">
                          {s.requiredDocuments?.length ?? 0} documents recorded
                        </span>
                      </span>
                      <ListChecks className="h-4 w-4 shrink-0 text-ink-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </PageBody>
    );
  }

  if (isLoading) {
    return (
      <PageBody>
        <LoadingState message="Loading the document list" rows={2} />
      </PageBody>
    );
  }

  if (!scheme) {
    return (
      <PageBody>
        <EmptyState
          title="That scheme is not on the register"
          description="Choose another scheme to build its checklist."
          action={
            <Button variant="outline" asChild>
              <Link to="/search">Search the register</Link>
            </Button>
          }
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <Link
        to={`/schemes/${scheme.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {scheme.name}
      </Link>

      <PageHeader
        eyebrow="Document checklist"
        title={scheme.name}
        description={
          documents.length
            ? `${have.length} of ${documents.length} ready. Tick each one off as you collect it.`
            : undefined
        }
        actions={
          documents.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
              <Printer className="h-4 w-4 text-ink-3" />
              Print this list
            </Button>
          )
        }
      />

      {documents.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={ListChecks}
            title="Documents not recorded for this scheme yet"
            description="The official notification has not been parsed for its document requirements. The portal on the scheme page lists them in the meantime."
            action={
              <Button variant="outline" asChild>
                <Link to={`/schemes/${scheme.slug}`}>Back to the scheme</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mt-8 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule">
              <div
                className="h-full rounded-full bg-sanction transition-[width] duration-300"
                style={{ width: `${(have.length / documents.length) * 100}%` }}
              />
            </div>
            <span className="register-strong shrink-0">
              {have.length}/{documents.length}
            </span>
          </div>

          <ul className="mt-8 divide-y divide-rule border-y border-rule">
            {documents.map((doc) => {
              const ticked = have.includes(doc.label);
              return (
                <li key={doc.label} className="flex gap-3.5 py-4">
                  <Checkbox
                    id={`doc-${doc.label}`}
                    checked={ticked}
                    onCheckedChange={() => toggleDoc(doc.label)}
                    className="mt-0.5"
                  />
                  <label htmlFor={`doc-${doc.label}`} className="min-w-0 cursor-pointer">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={cn(
                          'font-display text-[0.9375rem] font-semibold',
                          ticked ? 'text-ink-3 line-through' : 'text-ink'
                        )}
                      >
                        {doc.label}
                      </span>
                      <span className={doc.mandatory ? 'register-strong text-seal' : 'register'}>
                        {doc.mandatory ? 'Required' : 'If applicable'}
                      </span>
                    </span>
                    {doc.howToObtain && !ticked && (
                      <span className="mt-1 block text-[0.875rem] leading-relaxed text-ink-2">
                        {doc.howToObtain}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>

          {missing.length === 0 ? (
            <div className="mt-8 rounded-lg border border-sanction-edge bg-sanction-tint p-5">
              <p className="font-display text-[1rem] font-semibold text-sanction-deep">
                You have everything this scheme asks for
              </p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-sanction-deep/80">
                Apply on the official portal linked from the scheme page. Keep this list open while
                you fill the form.
              </p>
              <Button className="mt-4" asChild>
                <Link to={`/schemes/${scheme.slug}`}>Go to the scheme</Link>
              </Button>
            </div>
          ) : (
            <p className="mt-8 text-[0.875rem] leading-relaxed text-ink-2">
              {missing.length} still to collect. This list is kept on this device — signing in keeps
              it when you switch phone or browser.
            </p>
          )}
        </>
      )}
    </PageBody>
  );
};
