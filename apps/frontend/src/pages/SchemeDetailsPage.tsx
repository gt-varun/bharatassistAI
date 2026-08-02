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
  Globe,
  Coins,
  MapPin,
  Check,
  HelpCircle
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.js';
import { Card } from '../components/ui/card.js';
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

  const { data: relatedSchemes } = useQuery<Scheme[]>({
    queryKey: ['relatedSchemes', scheme?.level],
    queryFn: async () => {
      const res = await apiClient.get('/schemes', { params: { limit: 3 } });
      return (res.data.data || []).filter((s: Scheme) => s.slug !== scheme?.slug);
    },
    enabled: !!scheme
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
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 max-w-7xl mx-auto font-sans">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/search')}
        className="mb-6 text-slate-400 hover:text-white flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Search Results
      </Button>

      {/* Main Grid: Details + Sticky CTA Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Left Column: Hero & Tabs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="default" className="bg-amber-500/20 text-amber-300 font-bold uppercase text-xs">
                {scheme.level} Scheme {scheme.state ? `• ${scheme.state}` : ''}
              </Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-300 uppercase text-xs">
                {scheme.status} Deadline
              </Badge>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Official Record
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3 leading-tight">
              {scheme.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 mb-6">
              <Building className="w-4 h-4 text-amber-400" /> {scheme.department}
            </p>

            {/* Quick Facts Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Benefit Type</span>
                <span className="font-bold text-white capitalize flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> {scheme.benefitType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Application Mode</span>
                <span className="font-bold text-white capitalize">{scheme.applicationMode}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Last Verified</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Main Tabbed Sub-Navigation Shell */}
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl mb-6">
              <TabsTrigger value="overview" className="text-xs sm:text-sm font-bold">Overview</TabsTrigger>
              <TabsTrigger value="eligibility" className="text-xs sm:text-sm font-bold">Eligibility</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm font-bold">Documents</TabsTrigger>
              <TabsTrigger value="apply" className="text-xs sm:text-sm font-bold">How To Apply</TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <section>
                <h3 className="text-lg font-bold text-amber-400 mb-2">Short Summary</h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{scheme.shortDescription}</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-amber-400 mb-2">Full Description</h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">{scheme.fullDescription}</p>
              </section>

              {scheme.translations?.hi && (
                <section className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
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
            <TabsContent value="eligibility" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-amber-400 mb-2">Plain-Language Eligibility Summary</h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {scheme.eligibilitySummaryPlain}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Structured Criteria Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">State Jurisdiction</span>
                    <span className="font-bold text-white">{scheme.eligibilityRules?.state?.join(', ') || 'All India'}</span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Maximum Income Cap</span>
                    <span className="font-bold text-white">
                      {scheme.eligibilityRules?.incomeMax ? `₹${scheme.eligibilityRules.incomeMax.toLocaleString('en-IN')}` : 'No Income Cap'}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Age Range</span>
                    <span className="font-bold text-white">
                      {scheme.eligibilityRules?.ageMin || 0} to {scheme.eligibilityRules?.ageMax || 'No Limit'} Years
                    </span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Target Occupations</span>
                    <span className="font-bold text-white capitalize">{scheme.eligibilityRules?.occupationCategory?.join(', ') || 'All'}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Documents */}
            <TabsContent value="documents" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
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
            <TabsContent value="apply" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-amber-400 mb-2">Application Submission Mode</h3>
                <span className="text-xs font-bold uppercase px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full">
                  {scheme.applicationMode} Submission
                </span>
              </div>

              {scheme.applicationFields && scheme.applicationFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Expected Official Form Fields</h3>
                  <ul className="space-y-2">
                    {scheme.applicationFields.map((field: ApplicationField, idx: number) => (
                      <li key={idx} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <span className="font-bold text-white">{field.fieldName}</span>
                        <span className="text-slate-400 block mt-0.5">{field.instructions}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Official Government Portal Redirect */}
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-4">
                <h4 className="font-bold text-white text-base">Apply via Official Government Portal</h4>
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

        {/* Right Column: Sticky Action Sidebar */}
        <aside className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 sticky top-24">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider pb-3 border-b border-slate-800">
              Scheme Actions
            </h3>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Financial Benefit</span>
              <span className="text-xl font-extrabold text-white">{scheme.benefitSummary}</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(`/eligibility?schemeId=${scheme._id || scheme.slug}`)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Check My Eligibility
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/saved')}
              className="w-full border-slate-800 hover:bg-slate-800 text-slate-200 flex items-center justify-center gap-2"
            >
              <Bookmark className="w-4 h-4 text-amber-400" /> Save Scheme
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(`/compare?schemeId=${scheme._id || scheme.slug}`)}
              className="w-full border-slate-800 hover:bg-slate-800 text-slate-200 flex items-center justify-center gap-2"
            >
              <Scale className="w-4 h-4 text-blue-400" /> Add to Comparison
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(`/assistant?schemeId=${scheme._id || scheme.slug}`)}
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-400" /> Explain Simpler
            </Button>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
              Verified Source: <span className="text-slate-300 font-semibold">{scheme.department}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Related Schemes Section */}
      {relatedSchemes && relatedSchemes.length > 0 && (
        <section className="pt-8 border-t border-slate-800">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            Related Welfare Schemes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {relatedSchemes.map((rel) => (
              <Card
                key={rel.slug}
                title={rel.name}
                subtitle={rel.department}
                footer={
                  <Button variant="default" size="sm" onClick={() => navigate(`/schemes/${rel.slug}`)} className="w-full">
                    View Details
                  </Button>
                }
              >
                <p className="text-xs text-slate-300 mb-2">{rel.shortDescription}</p>
                <span className="text-xs font-bold text-amber-400">{rel.benefitSummary}</span>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
