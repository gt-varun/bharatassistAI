import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, ExternalLink, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { Scheme, RequiredDocument } from '@bharatassist/shared-types';

export const SchemeDetailsPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();

  const { data: scheme, isLoading, error } = useQuery<Scheme>({
    queryKey: ['scheme', idOrSlug],
    queryFn: async () => {
      const res = await apiClient.get(`/schemes/${idOrSlug}`);
      return res.data.data;
    },
    enabled: !!idOrSlug
  });

  if (isLoading) return <LoadingState message="Loading scheme details..." />;
  if (error || !scheme) {
    return (
      <div className="p-8 text-center text-white">
        <p className="text-red-400 mb-4">Scheme details could not be loaded.</p>
        <Button onClick={() => navigate('/search')}>Back to Search</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/search')} className="mb-6 flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Schemes
      </Button>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase mb-2 inline-block">
              {scheme.level} {scheme.state ? `• ${scheme.state}` : ''}
            </span>
            <h1 className="text-3xl font-extrabold">{scheme.name}</h1>
            <p className="text-sm text-gray-400">{scheme.department}</p>
          </div>
          <a
            href={scheme.officialPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-400 hover:underline text-sm font-semibold"
          >
            Official Portal <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-lg mb-6">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Benefit Summary</h3>
          <p className="text-lg font-bold text-white">{scheme.benefitSummary}</p>
        </div>

        <section className="mb-6">
          <h2 className="text-xl font-bold mb-2">Description</h2>
          <p className="text-slate-300 leading-relaxed">{scheme.fullDescription}</p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold mb-2">Eligibility Summary</h2>
          <p className="text-slate-300 bg-slate-900/40 p-4 rounded-lg border border-slate-700/40">
            {scheme.eligibilitySummaryPlain}
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" /> Required Documents
          </h2>
          <ul className="space-y-2">
            {scheme.requiredDocuments.map((doc: RequiredDocument, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300 bg-slate-900/30 p-3 rounded border border-slate-700/30">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">{doc.label}</span>
                  {doc.mandatory && <span className="text-xs text-red-400 ml-2 font-bold">(Mandatory)</span>}
                  <p className="text-xs text-gray-400 mt-0.5">{doc.howToObtain}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
