import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { Button } from '../components/ui/button.js';
import {
  GraduationCap,
  Tractor,
  UserCheck,
  HeartHandshake,
  Briefcase,
  Building2,
  Accessibility,
  SearchCheck,
  Coins,
  FileCheck,
  Landmark,
  Layers,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface CategoryCounts {
  segments: Record<string, number>;
  benefitTypes: Record<string, number>;
  levels: Record<string, number>;
  states: Record<string, number>;
}

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: counts, isLoading } = useQuery<CategoryCounts>({
    queryKey: ['categoryCounts'],
    queryFn: async () => {
      const res = await apiClient.get('/schemes/categories');
      return res.data.data;
    }
  });

  const segmentDefinitions = [
    { key: 'student', title: 'Students', icon: <GraduationCap className="w-6 h-6 text-blue-400" /> },
    { key: 'farmer', title: 'Farmers', icon: <Tractor className="w-6 h-6 text-emerald-400" /> },
    { key: 'women', title: 'Women', icon: <UserCheck className="w-6 h-6 text-pink-400" /> },
    { key: 'senior', title: 'Senior Citizens', icon: <HeartHandshake className="w-6 h-6 text-amber-400" /> },
    { key: 'entrepreneur', title: 'Entrepreneurs', icon: <Briefcase className="w-6 h-6 text-purple-400" /> },
    { key: 'msme', title: 'MSMEs', icon: <Building2 className="w-6 h-6 text-orange-400" /> },
    { key: 'pwd', title: 'Persons with Disabilities', icon: <Accessibility className="w-6 h-6 text-teal-400" /> },
    { key: 'jobseeker', title: 'Job Seekers', icon: <SearchCheck className="w-6 h-6 text-cyan-400" /> }
  ];

  const benefitDefinitions = [
    { key: 'cash', title: 'Cash Grants & Stipends', icon: <Coins className="w-6 h-6 text-emerald-400" /> },
    { key: 'loan', title: 'Subsidized Loans', icon: <Landmark className="w-6 h-6 text-blue-400" /> },
    { key: 'subsidy', title: 'Equipment & Material Subsidies', icon: <Layers className="w-6 h-6 text-amber-400" /> },
    { key: 'certificate', title: 'Certificates & Fee Waivers', icon: <FileCheck className="w-6 h-6 text-purple-400" /> }
  ];

  if (isLoading) return <LoadingState message="Loading government scheme categories..." />;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-slate-800">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-2 text-slate-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
          <h1 className="text-3xl font-extrabold tracking-tight">Browse Schemes by Category</h1>
          <p className="text-sm text-slate-400 mt-1">Explore available central and state welfare initiatives by beneficiary segment or benefit type.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/search')}>Open Smart Search</Button>
      </div>

      {/* Target Segment Categories */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
          Target Segments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {segmentDefinitions.map((seg) => {
            const count = counts?.segments[seg.key] || 0;
            return (
              <div
                key={seg.key}
                onClick={() => navigate(`/categories/${seg.key}`)}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 cursor-pointer transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {seg.icon}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                      {count} {count === 1 ? 'Scheme' : 'Schemes'}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1 group-hover:text-amber-400 transition-colors">
                    {seg.title}
                  </h3>
                </div>
                <div className="inline-flex items-center text-xs font-semibold text-amber-400 mt-4">
                  View List <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefit Type Categories */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
          Benefit Types
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {benefitDefinitions.map((b) => {
            const count = counts?.benefitTypes[b.key] || 0;
            return (
              <div
                key={b.key}
                onClick={() => navigate(`/search?benefitType=${b.key}`)}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 cursor-pointer transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                      {b.icon}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                      {count} Schemes
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1 group-hover:text-amber-400 transition-colors">
                    {b.title}
                  </h3>
                </div>
                <div className="inline-flex items-center text-xs font-semibold text-slate-400 group-hover:text-amber-400 mt-4">
                  Filter Search <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
