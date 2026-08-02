import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { Card } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Scheme } from '@bharatassist/shared-types';

export const CategorySchemeListPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ schemes: Scheme[]; total: number }>({
    queryKey: ['categorySchemes', slug],
    queryFn: async () => {
      const res = await apiClient.get(`/schemes/categories/${slug}`);
      return {
        schemes: res.data.data,
        total: res.data.pagination?.total || res.data.data.length
      };
    },
    enabled: !!slug
  });

  const categoryTitle = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Category';

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/categories')} className="mb-2 text-slate-400 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Categories
          </Button>
          <h1 className="text-3xl font-extrabold text-white">{categoryTitle} Schemes</h1>
          <p className="text-sm text-slate-400 mt-1">Found {data?.total || 0} active government schemes for {categoryTitle}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/search')}>Open Search Filters</Button>
      </header>

      {isLoading ? (
        <LoadingState message={`Fetching ${categoryTitle} schemes...`} />
      ) : !data?.schemes || data.schemes.length === 0 ? (
        <EmptyState title={`No schemes found for ${categoryTitle}`} description="Try exploring other categories or running a search query." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.schemes.map((scheme: Scheme) => (
            <Card
              key={scheme._id || scheme.slug}
              title={scheme.name}
              subtitle={scheme.department}
              footer={
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">
                    {scheme.level} {scheme.state ? `• ${scheme.state}` : ''}
                  </span>
                  <Button variant="default" size="sm" onClick={() => navigate(`/schemes/${scheme.slug}`)}>
                    View Details
                  </Button>
                </div>
              }
            >
              <p className="text-sm text-slate-300 mb-3">{scheme.shortDescription}</p>
              <div className="text-xs text-amber-400 font-semibold bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                {scheme.benefitSummary}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
