import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { SchemeRecord } from '../components/scheme/SchemeRecord';
import { EMPTY_FILTERS, FilterPanel, type Filters } from '../components/scheme/FilterPanel';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { benefitLabelKey, incomeLabelKey, segmentLabelKey } from '../lib/taxonomy';
import { cn } from '../lib/utils';

const PAGE_SIZE = 10;

interface SearchResponse {
  schemes: Scheme[];
  pagination: { total: number; page: number; totalPages: number };
}

/**
 * Human wording for an active filter chip. The translator is passed in rather
 * than reached for: this runs outside a component, where no hook is available.
 */
function chipLabel(t: TFunction, key: keyof Filters, value: string): string {
  switch (key) {
    case 'level':
      return value === 'central' ? t('search.levelCentral') : t('search.levelState');
    case 'segment':
      return t(segmentLabelKey(value));
    case 'benefitType':
      return t(benefitLabelKey(value));
    case 'incomeBand':
      return t(incomeLabelKey(value));
    case 'status':
      return value === 'open'
        ? t('record.accepting')
        : value === 'rolling'
          ? t('record.openAllYear')
          : t('record.closedShort');
    default:
      return value;
  }
}

export const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSaved, toggle } = useSavedSchemes();

  const [input, setInput] = useState(searchParams.get('q') ?? '');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filters, setFilters] = useState<Filters>(() => ({
    level: searchParams.get('level') ?? '',
    state: searchParams.get('state') ?? '',
    segment: searchParams.get('segment') ?? '',
    benefitType: searchParams.get('benefitType') ?? '',
    incomeBand: searchParams.get('incomeBand') ?? '',
    status: searchParams.get('status') ?? ''
  }));
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'relevance');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounce typing so the register isn't queried on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery(input);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(id);
  }, [input]);

  // A search should be shareable, so state lives in the URL.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
      if (filters[key]) params.set(key, filters[key]);
    });
    if (sort !== 'relevance') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [query, filters, sort, page, setSearchParams]);

  const { data, isLoading, isError } = useQuery<SearchResponse>({
    queryKey: ['schemes-search', query, filters, sort, page],
    queryFn: async () => {
      const res = await apiClient.get('/schemes/search', {
        params: {
          q: query || undefined,
          level: filters.level || undefined,
          state: filters.state || undefined,
          segment: filters.segment || undefined,
          benefitType: filters.benefitType || undefined,
          incomeBand: filters.incomeBand || undefined,
          status: filters.status || undefined,
          page,
          limit: PAGE_SIZE
        }
      });

      let schemes: Scheme[] = res.data?.data ?? [];
      if (sort === 'newest') {
        schemes = [...schemes].sort(
          (a, b) => new Date(b.lastVerifiedAt).getTime() - new Date(a.lastVerifiedAt).getTime()
        );
      } else if (sort === 'deadline') {
        schemes = [...schemes].sort((a, b) => {
          const at = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const bt = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return at - bt;
        });
      }

      return {
        schemes,
        pagination: res.data?.pagination ?? { total: schemes.length, page: 1, totalPages: 1 }
      };
    },
    placeholderData: (prev) => prev
  });

  const activeChips = useMemo(
    () =>
      (Object.keys(filters) as (keyof Filters)[])
        .filter((key) => filters[key])
        .map((key) => ({ key, value: filters[key], label: chipLabel(t, key, filters[key]) })),
    [filters]
  );

  const hasCriteria = Boolean(query) || activeChips.length > 0;

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearAll = () => {
    setInput('');
    setQuery('');
    setFilters(EMPTY_FILTERS);
    setSort('relevance');
    setPage(1);
  };

  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <PageBody>
      <PageHeader
        eyebrow={t('search.eyebrow')}
        title={t('search.title')}
        description={t('search.desc')}
      />

      {/* The search field */}
      <div className="mt-6 flex items-center gap-2 rounded-lg border border-rule-strong bg-surface p-2 shadow-card transition-[border-color,box-shadow] focus-within:border-sanction focus-within:shadow-focus">
        <Search className="ml-1.5 h-[1.15rem] w-[1.15rem] shrink-0 text-ink-4" />
        <label htmlFor="scheme-search" className="sr-only">
          {t('topbar.searchPlaceholder')}
        </label>
        <input
          id="scheme-search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('search.placeholder')}
          className="h-10 min-w-0 flex-1 bg-transparent text-[1rem] text-ink outline-none placeholder:text-ink-4 sm:text-[0.9375rem]"
          autoComplete="off"
        />
        {input && (
          <button
            type="button"
            onClick={() => setInput('')}
            aria-label={t('search.clearSearch')}
            className="rounded p-1.5 text-ink-4 transition-colors hover:bg-rule-soft hover:text-ink-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        {/* Filters — a column on desktop, a dialog on small screens */}
        <aside className="hidden lg:block">
          <div className="sticky top-[4.5rem]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="register">{t('search.filters')}</h2>
              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-[0.8125rem] font-medium text-sanction underline-offset-4 hover:underline"
                >
                  {t('search.reset')}
                </button>
              )}
            </div>
            <FilterPanel filters={filters} onChange={updateFilter} />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Result count and sort */}
          <div className="hair-bottom flex flex-wrap items-center justify-between gap-3 pb-3">
            <p className="text-[0.875rem] text-ink-2">
              {isLoading ? (
                'Searching…'
              ) : (
                <>
                  <span className="font-semibold text-ink">{total}</span>{' '}
                  {total === 1 ? 'scheme' : 'schemes'}
                  {hasCriteria ? ' match' : ' on the register'}
                  {total > PAGE_SIZE && (
                    <span className="text-ink-3">
                      {' '}
                      · page {page} of {totalPages}
                    </span>
                  )}
                </>
              )}
            </p>

            {/* On a phone these two share the full width rather than
                crowding the count into a corner; at 320px a fixed 11.5rem
                sort control plus a Filters button leaves nothing over. */}
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none lg:hidden"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4 text-ink-3" />
                Filters
                {activeChips.length > 0 && (
                  <span className="rounded bg-sanction px-1.5 font-mono text-micro text-white">
                    {activeChips.length}
                  </span>
                )}
              </Button>

              <Select
                value={sort}
                onValueChange={(v) => {
                  setSort(v);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="h-8 w-full min-w-0 flex-1 text-[0.8125rem] sm:w-[11.5rem] sm:flex-none"
                  aria-label={t('search.sortAria')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{t('search.sortBest')}</SelectItem>
                  <SelectItem value="newest">{t('search.sortVerified')}</SelectItem>
                  <SelectItem value="deadline">{t('search.sortClosing')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filters */}
          {activeChips.length > 0 && (
            <ul className="mt-3 flex flex-wrap items-center gap-1.5">
              {activeChips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={() => updateFilter(chip.key, '')}
                    className="flex items-center gap-1.5 rounded border border-rule-strong bg-surface px-2 py-1 text-[0.8125rem] text-ink-2 transition-colors hover:border-seal-edge hover:bg-seal-tint hover:text-seal"
                  >
                    {chip.label}
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-2 py-1 text-[0.8125rem] font-medium text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                >
                  {t('common.clearAll')}
                </button>
              </li>
            </ul>
          )}

          {/* Results */}
          <div className={cn('mt-5', isLoading && 'min-h-[20rem]')}>
            {isLoading && <LoadingState message={t('search.searching')} />}

            {!isLoading && isError && (
              <EmptyState
                title={t('search.failed')}
                description={t('search.failedDesc')}
                action={
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    {t('common.tryAgain')}
                  </Button>
                }
              />
            )}

            {!isLoading && !isError && data?.schemes.length === 0 && (
              <EmptyState
                title={t('search.noResults')}
                description={t('search.noResultsDesc')}
                action={
                  hasCriteria && (
                    <Button variant="outline" onClick={clearAll}>
                      {t('search.clearAllFilters')}
                    </Button>
                  )
                }
              />
            )}

            {!isLoading && !isError && data && data.schemes.length > 0 && (
              <ul className="space-y-3">
                {data.schemes.map((scheme) => (
                  <li key={scheme.slug || scheme._id}>
                    <SchemeRecord
                      scheme={scheme}
                      saved={isSaved(scheme.slug)}
                      onToggleSave={(s) => toggle(s.slug)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <nav
                className="hair-top mt-6 flex items-center justify-between pt-4"
                aria-label={t('search.pagesAria')}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage(page - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.previous')}
                </Button>
                <span className="register">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage(page + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  {t('common.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/*
        Filters as a bottom sheet on a phone. The six selects scroll inside
        the sheet while "Reset" and "Show N schemes" stay pinned at the
        bottom — the result count is the whole point of the panel, so it
        must not scroll away while you are changing the filters that drive
        it.
      */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('search.filters')}</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <FilterPanel filters={filters} onChange={updateFilter} />
          </DialogBody>

          <div className="hair-top flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setFilters(EMPTY_FILTERS)}>
              {t('search.reset')}
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {total} {total === 1 ? 'scheme' : 'schemes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
};
