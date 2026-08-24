import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, GitCompare, ExternalLink, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { isValidGovDomain } from '../lib/govAllowlist';
import { cn } from '../lib/utils';

export interface SchemeComparisonColumn {
  schemeId: string;
  schemeName: string;
  slug: string;
  department: string;
  level: 'central' | 'state';
  state: string | null;
  eligibilitySummary: string;
  requiredDocuments: { label: string; mandatory: boolean }[];
  requiredDocumentsCount: number;
  benefits: string;
  benefitType: string;
  applicationDeadline: string | null;
  applicationMode: 'online' | 'offline' | 'both';
  officialPortalUrl: string;
}

export interface ComparisonResponse {
  schemes: SchemeComparisonColumn[];
  differingFields: string[];
  differences: Record<string, boolean>;
}

/**
 * The criteria being compared, declared once.
 *
 * Both renderings below — the desktop matrix and the phone's stacked
 * cards — are generated from this list, so a criterion can never appear in
 * one and be quietly missing from the other, and "which fields differ"
 * stays a single decision rather than two copies of the same conditional.
 */
interface CompareRow {
  id: string;
  labelKey: string;
  /** Fields on the API's `differences` map that make this row a difference. */
  diffKeys: string[];
  render: (col: SchemeComparisonColumn) => React.ReactNode;
  /** Extra emphasis for the row citizens are really scanning for. */
  emphasis?: boolean;
}

const COMPARE_ROWS: CompareRow[] = [
  {
    id: 'government',
    labelKey: 'compare.governmentState',
    diffKeys: ['state', 'level'],
    render: (col) => (col.level === 'central' ? 'Central Scheme' : `State (${col.state})`)
  },
  {
    id: 'benefitType',
    labelKey: 'compare.benefitType',
    diffKeys: ['benefitType'],
    render: (col) => <span className="capitalize">{col.benefitType}</span>
  },
  {
    id: 'benefits',
    labelKey: 'compare.benefitSummary',
    diffKeys: [],
    render: (col) => col.benefits,
    emphasis: true
  },
  {
    id: 'eligibility',
    labelKey: 'compare.eligibility',
    diffKeys: ['eligibilitySummary'],
    render: (col) => col.eligibilitySummary
  },
  {
    id: 'documents',
    labelKey: 'compare.documents',
    diffKeys: ['requiredDocumentsCount'],
    render: (col) => (
      <>
        <span className="font-semibold">{col.requiredDocumentsCount}</span> documents
      </>
    )
  },
  {
    id: 'applicationMode',
    labelKey: 'compare.applicationMode',
    diffKeys: ['applicationMode'],
    render: (col) => <span className="capitalize">{col.applicationMode}</span>
  },
  {
    id: 'deadline',
    labelKey: 'compare.deadline',
    diffKeys: ['applicationDeadline'],
    render: (col) => col.applicationDeadline
  },
  {
    id: 'portal',
    labelKey: 'compare.portal',
    diffKeys: [],
    render: (col) =>
      col.officialPortalUrl && isValidGovDomain(col.officialPortalUrl) ? (
        <a
          href={col.officialPortalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-sanction hover:underline"
        >
          Official portal
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span className="text-micro text-ink-4">Unverified portal</span>
      )
  }
];

export const CompareSchemesPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawParams = searchParams.get('schemes') ?? '';
  const initialIds = rawParams ? rawParams.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const { slugs } = useSavedSchemes();
  const { schemes: savedSchemes } = useSchemeRecords(slugs);

  useEffect(() => {
    if (initialIds.length > 0) {
      setSelectedIds(initialIds);
    }
  }, [rawParams]);

  // Fetch Comparison API
  const {
    data: compareData,
    isLoading,
    isError,
    error
  } = useQuery<ComparisonResponse>({
    queryKey: ['compare', selectedIds.join(',')],
    queryFn: async () => {
      const res = await apiClient.post('/compare', { schemeIds: selectedIds });
      return res.data?.data;
    },
    enabled: selectedIds.length >= 2 && selectedIds.length <= 4
  });

  const toggleSelection = (slug: string) => {
    setSelectedIds((prev) => {
      let next: string[];
      if (prev.includes(slug)) {
        next = prev.filter((id) => id !== slug);
      } else {
        if (prev.length >= 4) return prev;
        next = [...prev, slug];
      }
      setSearchParams({ schemes: next.join(',') });
      return next;
    });
  };

  const clearSelection = () => {
    setSearchParams({});
    setSelectedIds([]);
  };

  // 1. Selector Screen if < 2 schemes selected
  if (selectedIds.length < 2) {
    return (
      <PageBody>
        <PageHeader
          eyebrow={t('compare.eyebrow')}
          title={t('compare.title')}
          description={t('compare.desc')}
        />

        <div className="mt-8">
          {savedSchemes.length < 2 ? (
            <EmptyState
              icon={GitCompare}
              title={t('compare.needTwo')}
              description={t('compare.needTwoDesc')}
              action={
                <Button asChild>
                  <Link to="/search">{t('compare.findToSave')}</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="register text-ink-2">
                  Select 2 to 4 schemes ({selectedIds.length} selected)
                </h2>
                {selectedIds.length >= 2 && (
                  <Button onClick={() => setSearchParams({ schemes: selectedIds.join(',') })}>
                    Compare {selectedIds.length} Schemes
                  </Button>
                )}
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {savedSchemes.map((s) => {
                  const checked = selectedIds.includes(s.slug);
                  return (
                    <li key={s.slug}>
                      <label
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                          checked
                            ? 'border-sanction bg-sanction-tint/40'
                            : 'border-rule bg-surface hover:border-rule-strong'
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSelection(s.slug)}
                          className="mt-1"
                        />
                        <div>
                          <span className="font-display text-[0.9375rem] font-semibold text-ink block">
                            {s.name}
                          </span>
                          <span className="register text-ink-3 block mt-1">
                            {s.department} • {s.level === 'central' ? 'Central' : s.state}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </PageBody>
    );
  }

  // 2. Loading State
  if (isLoading) {
    return (
      <PageBody>
        <LoadingState message={t('compare.comparing')} rows={4} />
      </PageBody>
    );
  }

  // 3. Error State
  if (isError || !compareData) {
    return (
      <PageBody>
        <EmptyState
          title={t('compare.failed')}
          description={error?.message || 'Verification failed for requested scheme IDs.'}
          action={
            <Button variant="outline" onClick={clearSelection}>
              {t('compare.clearSelection')}
            </Button>
          }
        />
      </PageBody>
    );
  }

  const { schemes, differingFields, differences } = compareData;

  return (
    <PageBody>
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/saved"
          className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('compare.backToSaved')}
        </Link>
        <Button variant="outline" size="sm" onClick={clearSelection}>
          {t('compare.changeSelection')}
        </Button>
      </div>

      <PageHeader
        eyebrow={t('compare.eyebrow')}
        title={t('compare.title')}
        description={`Comparing ${schemes.length} schemes. Differing criteria are automatically highlighted.`}
      />

      {/* Differing Fields Banner */}
      {differingFields.length > 0 && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-ochre-edge bg-ochre-tint p-4 text-[0.875rem] text-ochre">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {differingFields.length} key difference{differingFields.length > 1 ? 's' : ''} detected across selected schemes.
          </span>
        </div>
      )}

      {/*
        The comparison, in the two shapes a comparison can honestly take.

        Phones get criterion-major cards rather than the usual row-to-card
        conversion. A comparison exists to put values *beside* each other,
        and one card per scheme would force the reader to scroll back and
        forth to answer "which deadline is sooner?". Grouping by criterion
        keeps the answer inside one card. Nothing is dropped: every column
        of the desktop matrix appears here, and the same fields are
        highlighted as differing.
      */}
      <div className="mt-8 space-y-3 lg:hidden">
        {COMPARE_ROWS.map((row) => {
          const differs = row.diffKeys.some((key) => differences[key]);
          return (
            <section
              key={row.id}
              className={cn(
                'rounded-lg border bg-surface p-4',
                differs ? 'border-ochre-edge bg-ochre-tint/30' : 'border-rule'
              )}
            >
              <h3 className="register flex items-center justify-between gap-2">
                {t(row.labelKey)}
                {differs && (
                  <span className="register-strong text-ochre">{t('compare.differs')}</span>
                )}
              </h3>

              <dl className="mt-3 divide-y divide-rule">
                {schemes.map((col) => (
                  <div key={col.schemeId} className="grid gap-1 py-2.5 first:pt-0 last:pb-0">
                    <dt className="min-w-0 text-[0.8125rem] font-medium text-ink-2">
                      <Link
                        to={`/schemes/${col.slug}`}
                        className="underline-offset-4 hover:text-sanction hover:underline"
                      >
                        {col.schemeName}
                      </Link>
                    </dt>
                    <dd
                      className={cn(
                        'text-[0.875rem] leading-relaxed text-ink',
                        row.emphasis && 'font-medium text-sanction-deep'
                      )}
                    >
                      {row.render(col)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>

      {/* Desktop: the matrix, with the criteria column pinned while the
          scheme columns scroll sideways. */}
      <div className="mt-8 hidden overflow-x-auto rounded-xl border border-rule bg-surface lg:block">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-rule bg-surface-sunk">
              <th className="register sticky left-0 z-10 w-44 bg-surface-sunk p-4 text-xs uppercase text-ink-3">
                {t('compare.criteria')}
              </th>
              {schemes.map((col) => (
                <th
                  key={col.schemeId}
                  className="min-w-[14rem] p-4 font-display font-semibold text-ink"
                >
                  <Link
                    to={`/schemes/${col.slug}`}
                    className="underline-offset-4 hover:text-sanction hover:underline"
                  >
                    {col.schemeName}
                  </Link>
                  <span className="register mt-1 block text-micro font-normal text-ink-3">
                    {col.department}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-rule text-[0.875rem]">
            {COMPARE_ROWS.map((row) => {
              const differs = row.diffKeys.some((key) => differences[key]);
              return (
                <tr key={row.id} className={cn(differs && 'bg-ochre-tint')}>
                  {/*
                    The label cell is sticky, so its background must be
                    opaque and must match the row exactly — a translucent
                    sticky cell lets the scrolling scheme columns show
                    through it as they pass underneath.
                  */}
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 p-4 text-left font-medium text-ink-2',
                      differs ? 'bg-ochre-tint' : 'bg-surface'
                    )}
                  >
                    {t(row.labelKey)}
                  </th>
                  {schemes.map((col) => (
                    <td
                      key={col.schemeId}
                      className={cn(
                        'p-4 leading-relaxed text-ink',
                        row.emphasis && 'font-medium text-sanction-deep'
                      )}
                    >
                      {row.render(col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageBody>
  );
};
