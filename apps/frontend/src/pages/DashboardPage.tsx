import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bookmark,
  CalendarClock,
  LayoutGrid,
  MessagesSquare,
  Search
} from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { SchemeRecord } from '../components/scheme/SchemeRecord';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { daysUntil, formatDate } from '../lib/format';

const QUICK_PATHS = [
  { to: '/search', icon: Search, key: 'search' },
  { to: '/categories', icon: LayoutGrid, key: 'browse' },
  { to: '/assistant', icon: MessagesSquare, key: 'assistant' }
];

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { slugs, isSaved, toggle } = useSavedSchemes();
  const { schemes: savedSchemes, isLoading: savedLoading } = useSchemeRecords(slugs.slice(0, 3));

  const { data: recent, isLoading: recentLoading } = useQuery<Scheme[]>({
    queryKey: ['dashboard-recent'],
    queryFn: async () => {
      const res = await apiClient.get('/schemes', { params: { limit: 5 } });
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Deadlines worth acting on: anything closing inside 45 days.
  const closingSoon = useMemo(() => {
    const pool = [...savedSchemes, ...(recent ?? [])];
    const seen = new Set<string>();
    return pool
      .filter((s) => {
        if (seen.has(s.slug)) return false;
        seen.add(s.slug);
        const left = daysUntil(s.deadline);
        return left !== null && left >= 0 && left <= 45;
      })
      .sort((a, b) => (daysUntil(a.deadline) ?? 0) - (daysUntil(b.deadline) ?? 0))
      .slice(0, 3);
  }, [savedSchemes, recent]);

  return (
    <PageBody>
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title')}
        description={t('dashboard.desc')}
      />

      {/* Three ways in */}
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {QUICK_PATHS.map(({ to, icon: Icon, key }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex h-full flex-col rounded-lg border border-rule bg-surface p-4 transition-all duration-200 hover:-translate-y-px hover:border-sanction-edge hover:shadow-card"
            >
              <Icon
                className="h-5 w-5 text-ink-3 transition-colors group-hover:text-sanction"
                strokeWidth={1.6}
              />
              <span className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                {t(`dashboard.${key}Title`)}
              </span>
              <span className="mt-1 text-[0.8125rem] leading-relaxed text-ink-2">
                {t(`dashboard.${key}Blurb`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Closing soon */}
      {closingSoon.length > 0 && (
        <section className="mt-12">
          <h2 className="register mb-4 flex items-center gap-2 text-seal">
            <CalendarClock className="h-3.5 w-3.5" />
            {t('dashboard.closingSoon')}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {closingSoon.map((scheme) => {
              const left = daysUntil(scheme.deadline) ?? 0;
              return (
                <li key={scheme.slug}>
                  <Link
                    to={`/schemes/${scheme.slug}`}
                    className="flex h-full flex-col rounded-lg border border-seal-edge bg-seal-tint p-4 transition-colors hover:border-seal"
                  >
                    <span className="register-strong text-seal">
                      {left === 0 ? 'Closes today' : `${left} day${left === 1 ? '' : 's'} left`}
                    </span>
                    <span className="mt-2 font-display text-[0.9375rem] font-semibold leading-snug text-ink">
                      {scheme.name}
                    </span>
                    <span className="mt-auto pt-3 font-mono text-micro text-ink-3">
                      {formatDate(scheme.deadline)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Saved */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="register flex items-center gap-2">
            <Bookmark className="h-3.5 w-3.5" />
            {t('dashboard.savedHeading')}
          </h2>
          {slugs.length > 0 && (
            <Link
              to="/saved"
              className="text-[0.875rem] font-medium text-sanction underline-offset-4 hover:underline"
            >
              {t('common.seeAll')} ({slugs.length})
            </Link>
          )}
        </div>

        {slugs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-rule-strong bg-surface p-6">
            <p className="text-[0.9375rem] text-ink-2">{t('dashboard.savedEmpty')}</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/search">
                {t('common.findSchemes')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : savedLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <ul className="space-y-3">
            {savedSchemes.map((scheme) => (
              <li key={scheme.slug}>
                <SchemeRecord
                  scheme={scheme}
                  saved={isSaved(scheme.slug)}
                  onToggleSave={(s) => toggle(s.slug)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recently added */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="register">{t('dashboard.recentHeading')}</h2>
          <Link
            to="/search?sort=newest"
            className="text-[0.875rem] font-medium text-sanction underline-offset-4 hover:underline"
          >
            {t('common.seeAll')}
          </Link>
        </div>

        {recentLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <ul className="space-y-3">
            {recent?.map((scheme) => (
              <li key={scheme.slug}>
                <SchemeRecord
                  scheme={scheme}
                  saved={isSaved(scheme.slug)}
                  onToggleSave={(s) => toggle(s.slug)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageBody>
  );
};
