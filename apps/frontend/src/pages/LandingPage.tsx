import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { LanguageSelector } from '../components/ui/LanguageSelector';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <header className="px-6 py-4 border-b border-slate-800 flex justify-between items-center max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-900">
            BA
          </div>
          <span className="font-bold text-xl text-white">{t('common.appName')}</span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Button variant="primary" onClick={() => navigate('/auth')}>
            {t('common.login')}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center text-center px-4 py-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" /> AI-Powered Scheme Discovery
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          {t('landing.title')}
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl">
          {t('landing.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
          <Button variant="primary" size="lg" onClick={() => navigate('/search')} className="flex items-center gap-2">
            <Search className="w-5 h-5" /> {t('landing.exploreButton')}
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/assistant')} className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> AI Assistant
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/60">
            <Search className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Smart Search</h3>
            <p className="text-sm text-slate-400">Search in natural language across 11 Indian languages.</p>
          </div>
          <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/60">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Eligibility Engine</h3>
            <p className="text-sm text-slate-400">Deterministic check against your age, state, and income.</p>
          </div>
          <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/60">
            <FileText className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Document Checklist</h3>
            <p className="text-sm text-slate-400">Personalized checklists with step-by-step obtaining guides.</p>
          </div>
        </div>
      </main>
    </div>
  );
};
