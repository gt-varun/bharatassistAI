import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { LanguageSelector } from '../ui/LanguageSelector';
import { AssistantWidget } from '../assistant/AssistantWidget';
import { registerBackInterceptor } from '../../native/backButton';

/**
 * The signed-in shell, in two shapes for one set of routes.
 *
 * Desktop (lg and up) is unchanged: a fixed rail of destinations on the
 * left, a persistent search field on top (PRD §15), the page in the middle.
 *
 * Below lg the same destinations are laid out the way a phone expects
 * them — a quiet identity bar at the top, the four repeated journeys as
 * bottom tabs, and everything else one tap away in the drawer that the
 * rail already provided. The routes, the guards and the page components
 * are identical; only the furniture changes.
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

  /*
   * While the drawer is over the page, the page must not scroll underneath
   * it — on a touch screen a drag near the edge otherwise scrolls the list
   * behind the drawer, which reads as the app losing its place.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  /*
   * Android's back button closes the drawer before it touches history —
   * the layer the citizen can see is the layer back should dismiss. Only
   * registered while the drawer is actually open, so back behaves normally
   * the rest of the time. No-op on the web.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    return registerBackInterceptor(() => {
      setMobileOpen(false);
      return true;
    });
  }, [mobileOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  };

  return (
    <div className="flex min-h-screen min-h-dvh bg-paper">
      <a href="#main" className="skip-link">
        {t('nav.skipToContent')}
      </a>

      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 border-b border-rule bg-paper/85 pt-safe-t
                     pl-safe-l pr-safe-r backdrop-blur-md"
        >
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            {/*
              Phones: an identity bar. Search is a bottom tab and the rest of
              the rail is behind "More", so repeating either here would be a
              second navigation system for the same destinations.
            */}
            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sanction
                           font-display text-[0.8125rem] font-bold text-white shadow-card"
              >
                BA
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-[0.9375rem] font-semibold leading-tight text-ink">
                  {t('common.appName')}
                </span>
                <span className="register block truncate">{t('common.registerSub')}</span>
              </span>
            </div>

            {/* Desktop keeps the persistent search field and ⌘K. */}
            <form
              onSubmit={submitSearch}
              className="relative hidden min-w-0 flex-1 lg:block lg:max-w-md"
              role="search"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                aria-label={t('topbar.searchAria')}
                placeholder={t('topbar.searchPlaceholder')}
                className="h-9 w-full rounded-md border border-rule-strong bg-surface pl-9 pr-14 text-[0.875rem] text-ink transition-[border-color,box-shadow] placeholder:text-ink-4 focus:border-sanction focus:outline-none focus:ring-4 focus:ring-sanction/12"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-rule bg-surface-sunk px-1.5 py-0.5 font-mono text-micro text-ink-4 sm:block">
                ⌘K
              </kbd>
            </form>

            {/* Language stays reachable in one tap on every screen size. */}
            <div className="ml-auto shrink-0">
              <LanguageSelector className="w-auto xs:w-[8.5rem] lg:w-[10.5rem]" />
            </div>
          </div>
        </header>

        {/*
          The tab bar is fixed, so the page reserves its height plus the
          home-indicator inset — otherwise the last record in every list
          sits permanently underneath the navigation.
        */}
        <main id="main" className="flex-1 pb-mobile-chrome">
          <Outlet />
        </main>
      </div>

      <MobileTabBar onOpenMore={() => setMobileOpen(true)} moreOpen={mobileOpen} />
      <AssistantWidget />
    </div>
  );
};
