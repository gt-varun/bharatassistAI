import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { SchemeRecord } from '../components/scheme/SchemeRecord';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { segmentBySlug } from '../lib/taxonomy';

const PAGE_SIZE = 10;

export const CategorySchemeListPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const { isSaved, toggle } = useSavedSchemes();
  const [page, setPage] = useState(1);

  const segment = segmentBySlug(slug);

  const { data, isLoading, isError } = useQuery<{
    schemes: Scheme[];
    pagination: { total: number; totalPages: number };
  }>({
    queryKey: ['category-schemes', slug, page],
    queryFn: async () => {
      const res = await apiClient.get(`/schemes/categories/${slug}`, {
        params: { page, limit: PAGE_SIZE }
      });
      return {
        schemes: res.data?.data ?? [],
        pagination: res.data?.pagination ?? { total: 0, totalPages: 1 }
      };
    }
  });

  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <PageBody>
      <Link
        to="/categories"
        className="mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('landing.allCategories')}
      </Link>

      <PageHeader
        eyebrow={`${total} ${total === 1 ? 'scheme' : 'schemes'} in this category`}
        title={segment ? t(segment.labelKey) : slug}
        description={segment ? t(segment.blurbKey) : undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`/search?segment=${slug}`}>{t('categoryList.searchWithin')}</Link>
          </Button>
        }
      />

      <div className="mt-8">
        {isLoading && <LoadingState message={t('categoryList.loading')} />}

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
            title={t('categoryList.empty')}
            description={t('categoryList.emptyDesc')}
            action={
              <Button variant="outline" asChild>
                <Link to="/search">{t('categoryList.searchAll')}</Link>
              </Button>
            }
          />
        )}

        {!isLoading && data && data.schemes.length > 0 && (
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

        {!isLoading && totalPages > 1 && (
          <nav className="hair-top mt-6 flex items-center justify-between pt-4" aria-label={t('search.pagesAria')}>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
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
              onClick={() => setPage(page + 1)}
            >
              {t('common.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>
    </PageBody>
  );
};
