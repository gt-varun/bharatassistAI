import React, { useState } from 'react';
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
        All categories
      </Link>

      <PageHeader
        eyebrow={`${total} ${total === 1 ? 'scheme' : 'schemes'} in this category`}
        title={segment?.label ?? slug}
        description={segment?.blurb}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={`/search?segment=${slug}`}>Search within this category</Link>
          </Button>
        }
      />

      <div className="mt-8">
        {isLoading && <LoadingState message="Loading this category" />}

        {!isLoading && isError && (
          <EmptyState
            title="The register did not respond"
            description="The connection to the scheme service failed. Try again in a moment."
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try again
              </Button>
            }
          />
        )}

        {!isLoading && !isError && data?.schemes.length === 0 && (
          <EmptyState
            title="No schemes filed under this category yet"
            description="The register is updated as new notifications are published. Search across all categories in the meantime."
            action={
              <Button variant="outline" asChild>
                <Link to="/search">Search all schemes</Link>
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
          <nav className="hair-top mt-6 flex items-center justify-between pt-4" aria-label="Pages">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Previous
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
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>
    </PageBody>
  );
};
