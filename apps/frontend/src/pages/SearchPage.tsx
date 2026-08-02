import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Scheme } from '@bharatassist/shared-types';

export const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { data: schemes, isLoading } = useQuery<Scheme[]>({
    queryKey: ['schemes', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get('/schemes', { params: { q: searchTerm || undefined } });
      return res.data.data;
    }
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Browse & Search Schemes</h1>
        <Button variant="outline" onClick={() => navigate('/')}>Home</Button>
      </header>

      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Input
            placeholder="Search by scheme name, student, farmer, loan..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="default" className="flex items-center gap-2">
          <SearchIcon className="w-4 h-4" /> Search
        </Button>
      </div>

      {isLoading ? (
        <LoadingState message="Fetching government schemes..." />
      ) : !schemes || schemes.length === 0 ? (
        <EmptyState title="No schemes found" description="Try searching for student, farmer, or loan" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schemes.map((scheme: Scheme) => (
            <Card
              key={scheme._id || scheme.slug}
              title={scheme.name}
              subtitle={scheme.department}
              footer={
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">
                    {scheme.level}
                  </span>
                  <Button variant="default" size="sm" onClick={() => navigate(`/schemes/${scheme.slug}`)}>
                    View Details
                  </Button>
                </div>
              }
            >
              <p className="text-sm text-gray-300 mb-3">{scheme.shortDescription}</p>
              <div className="text-xs text-amber-400 font-medium">{scheme.benefitSummary}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
