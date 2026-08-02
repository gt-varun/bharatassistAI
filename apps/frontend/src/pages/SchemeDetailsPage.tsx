import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  FileText,
  Clock,
  Sparkles,
  Bookmark,
  Scale,
  ShieldCheck,
  Building,
  Calendar,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { isValidGovDomain } from '../lib/govAllowlist.js';
import { Scheme, RequiredDocument, ApplicationField } from '@bharatassist/shared-types';

export const SchemeDetailsPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: scheme, isLoading, error } = useQuery<Scheme>({
    queryKey: ['scheme', idOrSlug],
    queryFn: async () => {
      const res = await apiClient.get(`/schemes/${idOrSlug}`);
      return res.data.data;
    },
    enabled: !!idOrSlug
  });

  if (isLoading) return <LoadingState message="Loading official scheme record details..." />;

  if (error || !scheme) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Scheme Not Found</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          The requested government scheme record could not be found or may have been updated.
        </p>
        <Button variant="primary" onClick={() => navigate('/search')}>
          Back to Scheme Search
        </Button>
      </div>
    );
  }

  const isGovDomainValid = isValidGovDomain(scheme.officialPortalUrl);
  const formattedDate = scheme.lastVerifiedAt
    ? new Date(scheme.lastVerifiedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'Recently';

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 max-w-6xl mx-auto font-sans">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/search')}
        className="mb-6 text-slate-400 hover:text-white flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Search Results
      </Button>

      {/* Scheme Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <Badge variant="default" className="bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider">
            {scheme.level} Scheme {scheme.state ? `• ${scheme.state}` : ''}
          </Badge>
          <Badge variant="outline" className="border-slate-700 text-slate-300 uppercase">
            {scheme.status} Deadline
          </Badge>
          {scheme.targetSegments?.map((seg, idx) => (
            <Badge key={idx} variant="secondary" className="bg-slate-800 text-slate-300 capitalize">
              {seg}
            </Badge>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
          {scheme.name}
        </h1>

        <p className="text-sm sm:text-base text-slate-400 flex items-center gap-2 mb-6">
          <Building className="w-4 h-4 text-amber-400" /> {scheme.department}
        </p>

        {/* Key Benefit Banner */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">Financial / Welfare Benefit</span>
            <span className="text-lg font-extrabold text-white">{scheme.benefitSummary}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified: <span className="text-white font-medium">{formattedDate}</span>
          </div>
        </div>

        {/* CTA Actions Bar (Interface Integration to Person 2, 3, 4) */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(`/eligibility?schemeId=${scheme._id || scheme.slug}`)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 shadow-lg shadow-amber-500/20"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> Check My Eligibility
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/saved')}
            className="border-slate-700 hover:bg-slate-800 text-slate-200"
          >
            <Bookmark className="w-4 h-4 mr-2 text-amber-400" /> Save Scheme
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/compare?schemeId=${scheme._id || scheme.slug}`)}
            className="border-slate-700 hover:bg-slate-800 text-slate-200"
          >
            <Scale className="w-4 h-4 mr-2 text-blue-400" /> Add to Comparison
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/assistant?schemeId=${scheme._id || scheme.slug}`)}
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <Sparkles className="w-4 h-4 mr-2 text-purple-400" /> Explain Simpler
          </Button>
        </div>
      </div>

      {/* Main Tabbed Sub-Navigation Shell */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-8">
          <TabsTrigger value="overview" className="text-xs sm:text-sm font-bold">Overview</TabsTrigger>
          <TabsTrigger value="eligibility" className="text-xs sm:text-sm font-bold">Eligibility</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm font-bold">Documents</TabsTrigger>
          <TabsTrigger value="apply" className="text-xs sm:text-sm font-bold">How To Apply</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <section>
            <h3 className="text-lg font-bold text-amber-400 mb-2">Short Description</h3>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{scheme.shortDescription}</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-amber-400 mb-2">Full Description</h3>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">{scheme.fullDescription}</p>
          </section>

          {scheme.translations?.hi && (
            <section className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                <Globe className="w-4 h-4" /> Hindi Summary Translation
                {!scheme.translations.hi.verified && (
                  <span className="text-[10px] text-orange-400 font-semibold">(Machine Translation - Pending Human Verification)</span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{scheme.translations.hi.name}</h4>
              <p className="text-xs text-slate-300">{scheme.translations.hi.shortDescription}</p>
            </section>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Official Source Reference:</span>
              <a href={scheme.sourceRef} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                {scheme.sourceRef}
              </a>
            </div>
            <div>
              <span className="text-slate-400 block">Extraction Confidence Score:</span>
              <span className="text-emerald-400 font-bold">{(scheme.extractionConfidence || 0.95) * 100}%</span>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Eligibility */}
        <TabsContent value="eligibility" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-amber-400 mb-2">Plain-Language Eligibility Summary</h3>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {scheme.eligibilitySummaryPlain}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Structured Criteria Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">State Jurisdiction:</span>
                <span className="font-bold text-white">{scheme.eligibilityRules?.state?.join(', ') || 'All India'}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Maximum Income Cap:</span>
                <span className="font-bold text-white">
                  {scheme.eligibilityRules?.incomeMax ? `₹${scheme.eligibilityRules.incomeMax.toLocaleString('en-IN')}` : 'No Strict Cap'}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Age Eligibility Range:</span>
                <span className="font-bold text-white">
                  {scheme.eligibilityRules?.ageMin || 0} to {scheme.eligibilityRules?.ageMax || 'No Limit'} Years
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Target Occupations:</span>
                <span className="font-bold text-white capitalize">{scheme.eligibilityRules?.occupationCategory?.join(', ') || 'All'}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Documents */}
        <TabsContent value="documents" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-amber-400 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5" /> Required Document Checklist
          </h3>
          <ul className="space-y-3">
            {scheme.requiredDocuments?.map((doc: RequiredDocument, idx: number) => (
              <li key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{doc.label}</span>
                    {doc.mandatory && <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded">Mandatory</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{doc.howToObtain}</p>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>

        {/* Tab 4: How To Apply */}
        <TabsContent value="apply" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-amber-400 mb-2">Application Mode</h3>
            <span className="text-xs font-bold uppercase px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full">
              {scheme.applicationMode} Submission
            </span>
          </div>

          {scheme.applicationFields && scheme.applicationFields.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Expected Form Fields</h3>
              <ul className="space-y-2">
                {scheme.applicationFields.map((field: ApplicationField, idx: number) => (
                  <li key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <span className="font-bold text-white">{field.fieldName}</span>
                    <span className="text-slate-400 block mt-0.5">{field.instructions}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Official Government Portal Redirect (Rule 25 Domain Validated) */}
          <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-4">
            <h4 className="font-bold text-white text-base">Ready to Apply on Official Government Portal?</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              BharatAssist AI never submits forms on your behalf. Click below to open the official government website safely.
            </p>

            {isGovDomainValid ? (
              <a
                href={scheme.officialPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-emerald-500/20"
              >
                Go to Official Portal ({new URL(scheme.officialPortalUrl).hostname}) <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-300 text-xs rounded-xl max-w-md mx-auto">
                <AlertTriangle className="w-4 h-4 inline mr-1" /> External portal link is pending domain verification.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
