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
  Search,
  Sparkles
} from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { SchemeRecord } from '../components/scheme/SchemeRecord';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useCitizenProfile } from '../hooks/useCitizenProfile';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { daysUntil, formatDate } from '../lib/format';

interface Recommendation {
  scheme: Scheme;
  score: number;
  matchedCriteria: string[];
}

const QUICK_PATHS = [
  { to: '/search', icon: Search, key: 'search' },
  { to: '/categories', icon: LayoutGrid, key: 'browse' },
  { to: '/assistant', icon: MessagesSquare, key: 'assistant' }
];

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { slugs, isSaved, toggle, isInitializing } = useSavedSchemes();
  const { schemes: savedSchemes, isLoading: savedLoading } = useSchemeRecords(slugs.slice(0, 3));
  const { data: profile } = useCitizenProfile();

  const { data: recent, isLoading: recentLoading } = useQuery<Scheme[]>({
    queryKey: ['dashboard-recent'],
    queryFn: async () => {
      const res = await apiClient.get('/schemes', { params: { limit: 5 } });
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Profile-based recommendations: hard-filtered against the citizen profile,
  // then soft-scored — every card explains why it surfaced (PRD §11.14).
  const { data: recommendationData, isLoading: recommendationsLoading } = useQuery<{
    recommendations: Recommendation[];
    reason?: string;
  }>({
    queryKey: ['dashboard-recommendations'],
    queryFn: async () => {
      const res = await apiClient.get('/recommendations', { params: { limit: 3 } });
      return res.data?.data ?? { recommendations: [] };
    },
    staleTime: 2 * 60 * 1000
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
        // Someone who told us their name gets greeted by it. Everyone else
        // sees exactly what they saw before.
        title={
          profile?.fullName
            ? t('onboarding.greeting', { name: profile.fullName })
            : t('dashboard.title')
        }
        description={t('dashboard.desc')}
      />

      {/*
        Three ways in.

        Stacked as tall cards these are three full screens-worth of scroll
        before a citizen reaches anything from the register itself, so on a
        phone they become compact rows — icon, label, chevron — and only
        open out into the three-column card set once there is width for it.
        Same destinations, same copy, a third of the height.
      */}
      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {QUICK_PATHS.map(({ to, icon: Icon, key }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex h-full items-center gap-3.5 rounded-lg border border-rule bg-surface p-4 transition-all duration-200 hover:border-sanction-edge hover:shadow-card sm:flex-col sm:items-start sm:gap-0 sm:hover:-translate-y-px"
            >
              <Icon
                className="h-5 w-5 shrink-0 text-ink-3 transition-colors group-hover:text-sanction"
                strokeWidth={1.6}
              />
              <span className="min-w-0 flex-1 sm:flex-none">
                <span className="block font-display text-[0.9375rem] font-semibold text-ink sm:mt-3">
                  {t(`dashboard.${key}Title`)}
                </span>
                <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-2 sm:mt-1">
                  {t(`dashboard.${key}Blurb`)}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="h-4 w-4 shrink-0 text-ink-4 transition-colors group-hover:text-sanction sm:hidden"
              />
            </Link>
          </li>
        ))}
      </ul>

      {/* Recommended for you */}
      {(recommendationsLoading || (recommendationData?.recommendations?.length ?? 0) > 0) && (
        <section className="mt-12">
          <h2 className="register mb-4 flex items-center gap-2 text-sanction">
            <Sparkles className="h-3.5 w-3.5" />
            Recommended for you
          </h2>
          {recommendationsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : (
            <ul className="space-y-3">
              {recommendationData!.recommendations.map((rec) => (
                <li key={rec.scheme.slug}>
                  <SchemeRecord
                    scheme={rec.scheme}
                    matchReason={rec.matchedCriteria.slice(0, 2).join(' · ')}
                    saved={isSaved(rec.scheme.slug)}
                    onToggleSave={(s) => toggle(s.slug)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {!recommendationsLoading && recommendationData?.reason === 'no_profile' && (
        <section className="mt-12 rounded-lg border border-dashed border-rule-strong bg-surface p-6">
          <p className="font-display text-[0.9375rem] font-semibold text-ink">
            Complete your profile to see personal recommendations
          </p>
          <p className="mt-1.5 max-w-md text-[0.875rem] leading-relaxed text-ink-2">
            State, occupation and income are enough to start ranking the register against your
            situation.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/profile">
              Complete profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      )}

      {/* Closing soon */}
      {closingSoon.length > 0 && (
        <section className="mt-12">
          <h2 className="register mb-4 flex items-center gap-2 text-seal">
            <CalendarClock className="h-3.5 w-3.5" />
            Closing soon
          </h2>
          {/* Deadline tiles are short, so two fit side by side on all but
              the narrowest phones — a stack of three would push the saved
              list off the screen entirely. */}
          <ul className="grid gap-3 xs:grid-cols-2 sm:grid-cols-3">
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
              className="-my-3 inline-flex min-h-[2.75rem] items-center py-3 text-[0.875rem] font-medium text-sanction underline-offset-4 hover:underline"
            >
              {t('common.seeAll')} ({slugs.length})
            </Link>
          )}
        </div>

        {slugs.length === 0 ? (
          !isInitializing ? (
            <div className="rounded-lg border border-dashed border-rule-strong bg-surface p-6">
              <p className="text-[0.9375rem] text-ink-2">{t('dashboard.savedEmpty')}</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link to="/search">
                  {t('common.findSchemes')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <Skeleton className="h-28 w-full" />
          )
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
            className="-my-3 inline-flex min-h-[2.75rem] items-center py-3 text-[0.875rem] font-medium text-sanction underline-offset-4 hover:underline"
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
