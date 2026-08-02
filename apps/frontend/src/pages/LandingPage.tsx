import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ShieldCheck,
  FileText,
  GraduationCap,
  Tractor,
  UserCheck,
  HeartHandshake,
  Briefcase,
  Building2,
  Accessibility,
  SearchCheck,
  ArrowRight,
  Clock,
  HelpCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LanguageSelector } from '../components/ui/LanguageSelector';

interface SegmentCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const segments: SegmentCard[] = [
    {
      id: 'student',
      name: 'Students',
      description: 'Post-matric scholarships, fee concessions & educational loans',
      icon: <GraduationCap className="w-6 h-6 text-blue-400" />,
      color: 'hover:border-blue-500/50 hover:bg-blue-500/10'
    },
    {
      id: 'farmer',
      name: 'Farmers',
      description: 'Direct income support, crop insurance & equipment subsidies',
      icon: <Tractor className="w-6 h-6 text-emerald-400" />,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-500/10'
    },
    {
      id: 'women',
      name: 'Women',
      description: 'Maternity assistance, self-help group loans & welfare grants',
      icon: <UserCheck className="w-6 h-6 text-pink-400" />,
      color: 'hover:border-pink-500/50 hover:bg-pink-500/10'
    },
    {
      id: 'senior',
      name: 'Senior Citizens',
      description: 'Old-age pensions, healthcare coverage & travel concessions',
      icon: <HeartHandshake className="w-6 h-6 text-amber-400" />,
      color: 'hover:border-amber-500/50 hover:bg-amber-500/10'
    },
    {
      id: 'entrepreneur',
      name: 'Entrepreneurs',
      description: 'Startup capital, incubation support & seed grants',
      icon: <Briefcase className="w-6 h-6 text-purple-400" />,
      color: 'hover:border-purple-500/50 hover:bg-purple-500/10'
    },
    {
      id: 'msme',
      name: 'MSMEs',
      description: 'Collateral-free MUDRA loans, technology upgrades & credit guarantees',
      icon: <Building2 className="w-6 h-6 text-orange-400" />,
      color: 'hover:border-orange-500/50 hover:bg-orange-500/10'
    },
    {
      id: 'pwd',
      name: 'Persons with Disabilities',
      description: 'Disability pensions, assistive device aid & reservation quotas',
      icon: <Accessibility className="w-6 h-6 text-teal-400" />,
      color: 'hover:border-teal-500/50 hover:bg-teal-500/10'
    },
    {
      id: 'jobseeker',
      name: 'Job Seekers',
      description: 'Skill development training, apprenticeship stipends & career aid',
      icon: <SearchCheck className="w-6 h-6 text-cyan-400" />,
      color: 'hover:border-cyan-500/50 hover:bg-cyan-500/10'
    }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-900">
      {/* Navigation Top Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-extrabold text-slate-950 text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              BA
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block leading-none">
                {t('common.appName', 'BharatAssist AI')}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/90">
                Government Scheme Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/categories')}
              className="hidden md:inline-flex border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              Browse Categories
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/auth')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
            >
              {t('common.login', 'Sign In')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-6 border-b border-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" /> AI-Powered Citizen Scheme Discovery
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Discover Central & State <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Government Schemes
            </span>{' '}
            Instantly
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Find financial aid, scholarships, pensions, and subsidies matched to your age, income, and state in plain, simple language.
          </p>

          {/* Quick Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 p-2 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl mb-8"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search in plain language (e.g. scholarship for student in Karnataka)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent pl-12 pr-4 py-3.5 text-white placeholder-slate-400 text-sm focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              Search <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Core CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate('/search')}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white"
            >
              <Search className="w-4 h-4 mr-2 text-amber-400" /> Find Schemes For Me
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/categories')}
              className="border-slate-800 hover:bg-slate-900 text-slate-200"
            >
              Browse Categories
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/eligibility')}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              <HelpCircle className="w-4 h-4 mr-2 text-amber-400" /> Answer 3 Questions (Check Eligibility)
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/assistant')}
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              <Sparkles className="w-4 h-4 mr-2 text-purple-400" /> AI Assistant
            </Button>
          </div>
        </div>
      </section>

      {/* Segment Shortcuts Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Explore Schemes by Citizen Segment
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Select your category to browse curated central & state government welfare schemes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {segments.map((seg) => (
            <div
              key={seg.id}
              onClick={() => navigate(`/search?segment=${seg.id}`)}
              className={`p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${seg.color} flex flex-col justify-between group`}
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {seg.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                  {seg.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {seg.description}
                </p>
              </div>
              <div className="inline-flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                Explore Schemes <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Transparency Strip */}
      <section className="py-12 bg-slate-900/40 border-y border-slate-900 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Official Data Sources</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Directly synchronized with official Central and State ministry notifications.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Last Verified Indicator</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every scheme record displays its exact verification timestamp from government portals.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Zero Application Submissions</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                We prepare your checklist and guide you, then redirect to official `.gov.in` portals to apply securely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-900 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            © {new Date().getFullYear()} BharatAssist AI. Government Welfare Portal for Indian Citizens.
          </div>
          <div className="flex items-center gap-6">
            <a onClick={() => navigate('/search')} className="hover:text-slate-300 cursor-pointer">
              Smart Search
            </a>
            <a onClick={() => navigate('/categories')} className="hover:text-slate-300 cursor-pointer">
              Categories
            </a>
            <a onClick={() => navigate('/dev/ui-preview')} className="hover:text-amber-400 cursor-pointer font-semibold">
              UI Preview
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
