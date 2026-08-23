import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { LanguageSelector } from '../ui/LanguageSelector';
import { useAuth } from '../../auth/AuthContext';

/** Sections of the landing page itself — see LandingPage's section ids. */
const SECTIONS = [
  { href: '#who', label: 'Who it is for' },
  { href: '#benefits', label: 'What you get' },
  { href: '#how', label: 'How it works' },
  { href: '#languages', label: 'Languages' },
  { href: '#questions', label: 'Questions' }
];

export const PublicHeader: React.FC = () => {
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
              BharatAssist AI
            </span>
            <span className="register block">Scheme register</span>
          </span>
        </Link>

        {/* The landing page is the only surface this header serves, so the
            nav moves down the page rather than into the application.

            It appears at `lg`, not `md`: five section links alongside the
            brand, the language selector and the call to action need roughly
            900px, so on a 768–820px tablet they were overflowing the bar and
            pushing the page sideways. The same links stay in the footer at
            every width, so nothing becomes unreachable. */}
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="rounded px-3 py-1.5 text-[0.875rem] font-medium text-ink-2 transition-colors hover:bg-rule-soft hover:text-ink"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector className="w-auto xs:w-[8.5rem] sm:w-[10rem]" />
          {isAuthenticated ? (
            <Button size="sm" onClick={() => navigate('/dashboard')}>
              Open my schemes
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
