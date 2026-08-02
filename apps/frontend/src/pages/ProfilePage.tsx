import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { LoadingState } from '../components/ui/LoadingState';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await apiClient.get('/profile');
      return res.data.data;
    }
  });

  if (isLoading) return <LoadingState message="Loading your citizen profile..." />;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Citizen Profile</h1>
        <Button variant="outline" onClick={() => navigate('/search')}>Search Schemes</Button>
      </div>

      {error || !profile ? (
        <Card title="No Profile Found" subtitle="Please fill out your profile details to receive personalized scheme recommendations.">
          <Button variant="primary" onClick={() => navigate('/search')}>Browse Schemes</Button>
        </Card>
      ) : (
        <Card title="Profile Details" subtitle="Used to evaluate scheme eligibility deterministically.">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-gray-400">State</span>
              <span className="font-semibold">{profile.state}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-gray-400">District</span>
              <span className="font-semibold">{profile.district || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-gray-400">Age</span>
              <span className="font-semibold">{profile.age}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-gray-400">Occupation Category</span>
              <span className="font-semibold uppercase">{profile.occupationCategory}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-gray-400">Income Band</span>
              <span className="font-semibold">{profile.incomeBand}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
