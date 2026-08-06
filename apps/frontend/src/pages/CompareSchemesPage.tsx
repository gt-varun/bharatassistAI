import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, GitCompare, ExternalLink, Check, AlertCircle } from 'lucide-react';
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
        <LoadingState message="Comparing selected schemes side-by-side..." rows={4} />
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
            <Button variant="outline" onClick={() => setSelectedIds([])}>
              Clear selection
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
          Back to saved schemes
        </Link>
        <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
          Change selection
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

      {/* Comparison Table */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-surface">
        <table className="w-full text-left border-collapse min-w-[40rem]">
          <thead>
            <tr className="border-b border-rule bg-surface-2">
              <th className="p-4 register uppercase text-xs text-ink-3 w-44 sticky left-0 bg-surface-2">
                Criteria
              </th>
              {schemes.map((col) => (
                <th key={col.schemeId} className="p-4 font-display font-semibold text-ink min-w-[14rem]">
                  <Link to={`/schemes/${col.slug}`} className="hover:text-sanction underline-offset-4 hover:underline">
                    {col.schemeName}
                  </Link>
                  <span className="block text-micro register font-normal text-ink-3 mt-1">
                    {col.department}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule text-[0.875rem]">
            {/* Level & State */}
            <tr className={cn(differences['state'] || differences['level'] ? 'bg-ochre-tint/20' : '')}>
              <td className="p-4 font-medium text-ink-2 bg-surface">Government / State</td>
              {schemes.map((col) => (
                <td key={col.schemeId} className="p-4 text-ink">
                  {col.level === 'central' ? 'Central Scheme' : `State (${col.state})`}
                </td>
              ))}
            </tr>

            {/* Benefit Type */}
            <tr className={cn(differences['benefitType'] ? 'bg-ochre-tint/20' : '')}>
              <td className="p-4 font-medium text-ink-2 bg-surface">{t('compare.benefitType')}</td>
              {schemes.map((col) => (
                <td key={col.schemeId} className="p-4 text-ink capitalize">
                  {col.benefitType}
                </td>
              ))}
            </tr>

            {/* Benefit Summary */}
            <tr>
              <td className="p-4 font-medium text-ink-2 bg-surface">{t('compare.benefitSummary')}</td>
              {schemes.map((col) => (
                <td key={col.schemeId} className="p-4 text-ink font-medium text-sanction-deep">
                  {col.benefits}
                </td>
              ))}
            </tr>

            {/* Eligibility Summary */}
            <tr className={cn(differences['eligibilitySummary'] ? 'bg-ochre-tint/20' : '')}>
              <td className="p-4 font-medium text-ink-2 bg-surface">{t('compare.eligibility')}</td>
              {schemes.map((col) => (
                <td key={col.schemeId} className="p-4 text-ink-2 leading-relaxed">
                  {col.eligibilitySummary}
                </td>
              ))}
            </tr>

            {/* Required Documents Count */}
            <tr className={cn(differences['requiredDocumentsCount'] ? 'bg-ochre-tint/20' : '')}>
              <td className="p-4 font-medium text-ink-2 bg-surface">{t('compare.documents')}</td>
              {schemes.map((col) => (
                <td key={col.schemeId} className="p-4 text-ink">
                  <span className="font-semibold">{col.requiredDocumentsCount}</span> documents
                </td>
              ))}
            </tr>

            {/* Application Mode */}
            <tr className={cn(differences['applicationMode'] ? 'bg-ochre-tint/20' : '')}>
              <td className="p-4 font-medium text-ink-2 bg-surface">{t('compare.applicationMode')}</td>
              {schemes.map((col) => (
                <td key={col.schemeId} className="p-4 text-ink capitalize">
                  {col.applicationMode}
                </td>
              ))}
            </tr>

            {/* Application Deadline */}
            <tr className={cn(differences['applicationDeadline'] ? 'bg-ochre-tint/20' : '')}>
              <td className="p-4 font-medium text-ink-2 bg-surface">{t('compare.deadline')}</td>
              {schemes.map((col) => (
                <td key={col.schemeId} className="p-4 text-ink">
                  {col.applicationDeadline}
                </td>
              ))}
            </tr>

            {/* Actions & Official Portal Link */}
            <tr>
              <td className="p-4 font-medium text-ink-2 bg-surface">{t('compare.portal')}</td>
              {schemes.map((col) => {
                const valid = isValidGovDomain(col.officialPortalUrl);
                return (
                  <td key={col.schemeId} className="p-4">
                    {col.officialPortalUrl && valid ? (
                      <a
                        href={col.officialPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sanction font-medium hover:underline"
                      >
                        Official Portal
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-ink-4 text-micro">{t('compare.unverifiedPortal')}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </PageBody>
  );
};
