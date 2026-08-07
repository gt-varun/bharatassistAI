import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { LanguageSelector } from '../ui/LanguageSelector';
import { useAuth } from '../../auth/AuthContext';

/** Sections of the landing page itself — see LandingPage's section ids. */
const SECTIONS = [
  { href: '#who', key: 'landing.navWho' },
  { href: '#benefits', key: 'landing.navBenefits' },
  { href: '#how', key: 'landing.navHow' },
  { href: '#languages', key: 'landing.navLanguages' },
  { href: '#questions', key: 'landing.navQuestions' }
];

export const PublicHeader: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-sanction/60">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-sanction font-display text-[0.9375rem] font-bold text-white shadow-card">
            BA
          </span>
          <span className="hidden sm:block">
            <span className="block font-display text-[0.9375rem] font-semibold leading-tight text-ink">
              {t('common.appName')}
            </span>
            <span className="register block">{t('common.registerSub')}</span>
          </span>
        </Link>

        {/* The landing page is the only surface this header serves, so the
            nav moves down the page rather than into the application. */}
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label={t('nav.primary')}>
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="rounded px-3 py-1.5 text-[0.875rem] font-medium text-ink-2 transition-colors hover:bg-rule-soft hover:text-ink"
            >
              {t(section.key)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector className="w-[8.5rem] sm:w-[10rem]" />
          {isAuthenticated ? (
            <Button size="sm" onClick={() => navigate('/dashboard')}>
              {t('nav.openMySchemes')}
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')}>
              {t('common.signIn')}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
