import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
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
  ArrowLeft,
  Sparkles,
  MapPin,
  Globe
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
    { key: 'student', title: 'Students & Scholars', desc: 'Post-matric fee reimbursement, stipends & education aid', icon: <GraduationCap className="w-7 h-7 text-blue-400" /> },
    { key: 'farmer', title: 'Farmers & Agriculture', desc: 'PM-KISAN direct income, crop insurance & equipment subsidies', icon: <Tractor className="w-7 h-7 text-emerald-400" /> },
    { key: 'women', title: 'Women Empowerment', desc: 'Maternity assistance, self-help group loans & welfare grants', icon: <UserCheck className="w-7 h-7 text-pink-400" /> },
    { key: 'senior', title: 'Senior Citizens', desc: 'IGNOAPS old-age pensions, healthcare coverage & concessions', icon: <HeartHandshake className="w-7 h-7 text-amber-400" /> },
    { key: 'entrepreneur', title: 'Entrepreneurs & Startups', desc: 'Startup seed capital, incubation support & credit lines', icon: <Briefcase className="w-7 h-7 text-purple-400" /> },
    { key: 'msme', title: 'MSMEs & Small Business', desc: 'PMMY MUDRA loans, technology upgrades & collateral-free credit', icon: <Building2 className="w-7 h-7 text-orange-400" /> },
    { key: 'pwd', title: 'Persons with Disabilities', desc: 'Disability pensions, assistive device aid & reservation quotas', icon: <Accessibility className="w-7 h-7 text-teal-400" /> },
    { key: 'jobseeker', title: 'Job Seekers & Trainees', desc: 'Skill development stipends, apprenticeship aid & career guidance', icon: <SearchCheck className="w-7 h-7 text-cyan-400" /> }
  ];

  const benefitDefinitions = [
    { key: 'cash', title: 'Cash Grants & Direct Income', desc: 'Direct bank transfers (DBT) and monthly stipends', icon: <Coins className="w-7 h-7 text-emerald-400" /> },
    { key: 'loan', title: 'Subsidized Loans & Credit Guarantee', desc: 'Low-interest collateral-free loan facilities', icon: <Landmark className="w-7 h-7 text-blue-400" /> },
    { key: 'subsidy', title: 'Equipment & Material Subsidies', desc: 'Subsidized machinery, fertilizers, and tools', icon: <Layers className="w-7 h-7 text-amber-400" /> },
    { key: 'certificate', title: 'Fee Waivers & Certified Services', desc: 'Tuition waivers and free government services', icon: <FileCheck className="w-7 h-7 text-purple-400" /> }
  ];

  if (isLoading) return <LoadingState message="Loading government scheme categories..." />;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-slate-800">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-2 text-slate-400 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h1 className="text-3xl font-extrabold tracking-tight">Browse Schemes by Category</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">Explore central and state welfare initiatives by beneficiary segment or benefit type.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/search')}>Open Smart Search</Button>
      </div>

      {/* Central vs State Governance Level Overview Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
        <div
          onClick={() => navigate('/search?level=central')}
          className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-amber-950/40 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all duration-300 shadow-xl group"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Globe className="w-7 h-7 text-amber-400" />
            </div>
            <Badge variant="default" className="bg-amber-500/20 text-amber-300 font-bold uppercase">
              {counts?.levels['central'] || 0} Central Schemes
            </Badge>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
            Central Government Schemes
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            Applicable across all Indian states & Union Territories, sponsored by Government of India Ministries.
          </p>
          <div className="inline-flex items-center text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
            Browse Central Schemes <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        <div
          onClick={() => navigate('/search?level=state')}
          className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950/40 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all duration-300 shadow-xl group"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <MapPin className="w-7 h-7 text-blue-400" />
            </div>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 font-bold uppercase">
              {counts?.levels['state'] || 0} State Schemes
            </Badge>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
            State Government Schemes
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            State-specific welfare benefits provided by Karnataka, Delhi, Maharashtra, Tamil Nadu, and state departments.
          </p>
          <div className="inline-flex items-center text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
            Browse State Schemes <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </section>

      {/* Target Segment Categories */}
      <section className="mb-14">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            Target Citizen Segments
          </h2>
          <span className="text-xs text-slate-400">8 Categories</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {segmentDefinitions.map((seg) => {
            const count = counts?.segments[seg.key] || 0;
            return (
              <div
                key={seg.key}
                onClick={() => navigate(`/categories/${seg.key}`)}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 cursor-pointer transition-all duration-300 flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform border border-slate-800">
                      {seg.icon}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                      {count} {count === 1 ? 'Scheme' : 'Schemes'}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2 group-hover:text-amber-400 transition-colors">
                    {seg.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{seg.desc}</p>
                </div>
                <div className="inline-flex items-center text-xs font-bold text-amber-400 mt-2">
                  View Schemes List <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefit Type Categories */}
      <section className="mb-14">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            Benefit Types & Assistance
          </h2>
          <span className="text-xs text-slate-400">4 Types</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {benefitDefinitions.map((b) => {
            const count = counts?.benefitTypes[b.key] || 0;
            return (
              <div
                key={b.key}
                onClick={() => navigate(`/search?benefitType=${b.key}`)}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 cursor-pointer transition-all duration-300 flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800">
                      {b.icon}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                      {count} Schemes
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2 group-hover:text-amber-400 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{b.desc}</p>
                </div>
                <div className="inline-flex items-center text-xs font-bold text-slate-400 group-hover:text-amber-400 mt-2">
                  Filter Search Results <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
