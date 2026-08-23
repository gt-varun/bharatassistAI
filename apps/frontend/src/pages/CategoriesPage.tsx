import { useTranslation } from 'react-i18next';
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Landmark, MapPin } from 'lucide-react';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Skeleton } from '../components/ui/skeleton';
import { BENEFIT_TYPES, SEGMENTS } from '../lib/taxonomy';

interface CategoryCounts {
  segments: Record<string, number>;
  benefitTypes: Record<string, number>;
  levels: Record<string, number>;
  states: Record<string, number>;
}

const plural = (n: number) => `${n} ${n === 1 ? 'scheme' : 'schemes'}`;

export const CategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<CategoryCounts>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/schemes/categories');
      return res.data?.data ?? { segments: {}, benefitTypes: {}, levels: {}, states: {} };
    },
    staleTime: 5 * 60 * 1000
  });

  const states = Object.entries(data?.states ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <PageBody>
      <PageHeader
        eyebrow={t('categories.eyebrow')}
        title={t('categories.title')}
        description={t('categories.desc')}
      />

      {/* ---- By who you are ---- */}
      <section className="mt-10">
        <h2 className="register mb-4">{t('categories.byWho')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SEGMENTS.map((segment) => {
            const Icon = segment.icon;
            const count = data?.segments?.[segment.slug];
            return (
              <li key={segment.slug}>
                <Link
                  to={`/categories/${segment.slug}`}
                  className="group flex h-full gap-3.5 rounded-lg border border-rule bg-surface p-4 transition-all duration-200 hover:-translate-y-px hover:border-sanction-edge hover:shadow-card"
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-rule bg-surface-sunk text-ink-3 transition-colors group-hover:border-sanction-edge group-hover:bg-sanction-tint group-hover:text-sanction">
                    <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-[0.9375rem] font-semibold text-ink">
                        {t(segment.labelKey)}
                      </span>
                      {isLoading ? (
                        <Skeleton className="h-3 w-14" />
                      ) : (
                        <span className="shrink-0 font-mono text-micro text-ink-4">
                          {plural(count ?? 0)}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-2">
                      {t(segment.blurbKey)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- By what you receive ---- */}
      <section className="mt-12">
        <h2 className="register mb-4">{t('categories.byBenefit')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFIT_TYPES.map((benefit) => {
            const Icon = benefit.icon;
            const count = data?.benefitTypes?.[benefit.slug];
            return (
              <li key={benefit.slug}>
                <Link
                  to={`/search?benefitType=${benefit.slug}`}
                  className="group flex h-full items-center gap-3.5 rounded-lg border border-rule bg-surface p-4 transition-all duration-200 hover:-translate-y-px hover:border-sanction-edge hover:shadow-card"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-rule bg-surface-sunk text-ink-3 transition-colors group-hover:border-sanction-edge group-hover:bg-sanction-tint group-hover:text-sanction">
                    <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[0.9375rem] font-semibold text-ink">
                      {t(benefit.labelKey)}
                    </span>
                    <span className="block text-[0.8125rem] text-ink-2">{t(benefit.blurbKey)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-micro text-ink-4">
                    {isLoading ? '' : count ?? 0}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- By government ---- */}
      <section className="mt-12">
        <h2 className="register mb-4">{t('categories.byGovernment')}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/search?level=central"
            className="record record-interactive block p-5 pl-6"
            data-level="central"
          >
            <span className="flex items-center gap-2 text-sanction">
              <Landmark className="h-4 w-4" strokeWidth={1.8} />
              <span className="register-strong text-sanction">{t('search.levelCentral')}</span>
            </span>
            <span className="mt-2 block font-display text-xl font-semibold text-ink">
              {isLoading ? '—' : plural(data?.levels?.central ?? 0)}
            </span>
            <span className="mt-1 block text-[0.875rem] text-ink-2">
              {t('categories.centralBlurb')}
            </span>
          </Link>

          <Link
            to="/search?level=state"
            className="record record-interactive block p-5 pl-6"
            data-level="state"
          >
            <span className="flex items-center gap-2 text-indigo">
              <MapPin className="h-4 w-4" strokeWidth={1.8} />
              <span className="register-strong text-indigo">{t('search.levelState')}</span>
            </span>
            <span className="mt-2 block font-display text-xl font-semibold text-ink">
              {isLoading ? '—' : plural(data?.levels?.state ?? 0)}
            </span>
            <span className="mt-1 block text-[0.875rem] text-ink-2">
              {t('categories.stateBlurb')}
            </span>
          </Link>
        </div>

        {states.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {states.map(([state, count]) => (
              <li key={state}>
                <Link
                  to={`/search?state=${encodeURIComponent(state)}`}
                  className="tap-target flex items-center gap-1.5 rounded border border-rule-strong bg-surface px-2.5 py-1 text-[0.8125rem] text-ink-2 transition-colors hover:border-indigo-edge hover:bg-indigo-tint hover:text-indigo"
                >
                  {state}
                  <span className="font-mono text-micro text-ink-4">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageBody>
  );
};
