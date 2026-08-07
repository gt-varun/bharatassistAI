import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { LanguageSelector } from '../ui/LanguageSelector';

/**
 * The signed-in / browsing shell: a fixed rail of destinations on the left,
 * a persistent search field on top (PRD §15), and the page itself in the
 * middle. Everything except the record list is deliberately quiet.
 */
export const AppShell: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl-K puts the cursor in search from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <a href="#main" className="skip-link">
        {t('nav.skipToContent')}
      </a>

      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t("nav.openNav")}
              className="-ml-1 rounded p-2 text-ink-2 transition-colors hover:bg-rule-soft lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <form onSubmit={submitSearch} className="relative min-w-0 flex-1 sm:max-w-md" role="search">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                aria-label={t("topbar.searchAria")}
                placeholder={t("topbar.searchPlaceholder")}
                className="h-9 w-full rounded-md border border-rule-strong bg-surface pl-9 pr-14 text-[0.875rem] text-ink transition-[border-color,box-shadow] placeholder:text-ink-4 focus:border-sanction focus:outline-none focus:ring-4 focus:ring-sanction/12"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-rule bg-surface-sunk px-1.5 py-0.5 font-mono text-micro text-ink-4 sm:block">
                ⌘K
              </kbd>
            </form>

            <div className="ml-auto hidden lg:block">
              <LanguageSelector className="w-[10.5rem]" />
            </div>
          </div>
        </header>

        <main id="main" className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
