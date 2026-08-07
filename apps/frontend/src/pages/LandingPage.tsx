import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  LayoutGrid,
  ListChecks,
  Search,
  MessagesSquare,
  ShieldCheck,
  FileText,
  Languages as LanguagesIcon
} from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import { SchemeRecord } from '../components/scheme/SchemeRecord';
import { QuickMatchDialog } from '../components/QuickMatchDialog';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { SEGMENTS, BENEFIT_TYPES } from '../lib/taxonomy';
import { ALL_LANGUAGES } from '../i18n/config';
import { formatDate } from '../lib/format';

/**
 * Real phrasings citizens use — the placeholder teaches the search. These are
 * keys, not sentences: an example query that stays in English teaches nothing
 * to someone reading the page in Tamil.
 */
const EXAMPLE_QUERY_KEYS = [
  'landing.example1',
  'landing.example2',
  'landing.example3',
  'landing.example4',
  'landing.example5'
];

/** The journey is a real sequence, so it is numbered. */
const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'];

const FAQ_KEYS = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5', 'faq6'];

function useTypedPlaceholder(phrases: string[]) {
  const [text, setText] = useState('');
  const indexRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(phrases[0]);
      return;
    }

    let timer: number;
    const tick = () => {
      const phrase = phrases[indexRef.current];
      if (!deletingRef.current) {
        charRef.current += 1;
        setText(phrase.slice(0, charRef.current));
        if (charRef.current === phrase.length) {
          deletingRef.current = true;
          timer = window.setTimeout(tick, 2200);
          return;
        }
      } else {
        charRef.current -= 1;
        setText(phrase.slice(0, charRef.current));
        if (charRef.current === 0) {
          deletingRef.current = false;
          indexRef.current = (indexRef.current + 1) % phrases.length;
        }
      }
      timer = window.setTimeout(tick, deletingRef.current ? 22 : 46);
    };

    timer = window.setTimeout(tick, 600);
    return () => window.clearTimeout(timer);
  }, [phrases]);

  return text;
}

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [quickMatchOpen, setQuickMatchOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const typed = useTypedPlaceholder(EXAMPLE_QUERY_KEYS.map((k) => t(k)));

  const { data: recent, isLoading: recentLoading } = useQuery<Scheme[]>({
    queryKey: ['landing-recent'],
    queryFn: async () => {
      const res = await apiClient.get('/schemes', { params: { limit: 3 } });
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: counts } = useQuery<{
    segments: Record<string, number>;
    levels: Record<string, number>;
    states: Record<string, number>;
  }>({
    queryKey: ['landing-counts'],
    queryFn: async () => {
      const res = await apiClient.get('/schemes/categories');
      return res.data?.data ?? { segments: {}, levels: {}, states: {} };
    },
    staleTime: 5 * 60 * 1000
  });

  const totals = useMemo(() => {
    const levels = counts?.levels ?? {};
    const central = levels.central ?? 0;
    const state = levels.state ?? 0;
    return { total: central + state, states: Object.keys(counts?.states ?? {}).length };
  }, [counts]);

  // The register's own freshness, taken from the records themselves.
  const lastVerified = useMemo(() => {
    if (!recent?.length) return null;
    return recent.reduce<string | Date | null>((latest, s) => {
      if (!latest) return s.lastVerifiedAt;
      return new Date(s.lastVerifiedAt) > new Date(latest) ? s.lastVerifiedAt : latest;
    }, null);
  }, [recent]);

  /**
   * The register itself is behind sign-in, so every call to action on this
   * page goes to the door — carrying where the visitor was actually headed,
   * which /login replays once they are through.
   */
  const enter = (intended: string) => navigate('/login', { state: { from: intended } });

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    enter(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <a href="#main" className="skip-link">
        {t('nav.skipToContent')}
      </a>
      <PublicHeader />

      <main id="main" className="flex-1">
        {/* ---------------- Hero: the front desk of the register --------- */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="paper-grid paper-fade absolute inset-0 -z-10" />

          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] lg:items-end lg:px-8">
            <div className="stagger max-w-3xl">
              <p className="register-strong flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sanction" />
                {t('landing.eyebrow')}
              </p>

              <h1 className="mt-5 text-balance font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[3.25rem]">
                {t('landing.titleLine1')}
                <br />
                <span className="text-sanction">{t('landing.titleLine2')}</span>
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-ink-2">
                {t('landing.desc')}
              </p>

              {/* The hero object: one field, plain language. */}
              <form onSubmit={runSearch} className="mt-8" role="search">
                <label htmlFor="hero-search" className="sr-only">
                  {t('landing.searchLabel')}
                </label>
                <div className="flex flex-col gap-2 rounded-lg border border-rule-strong bg-surface p-2 shadow-card transition-[border-color,box-shadow] focus-within:border-sanction focus-within:shadow-focus sm:flex-row sm:items-center">
                  <div className="relative flex min-w-0 flex-1 items-center">
                    <Search className="pointer-events-none absolute left-3 h-[1.15rem] w-[1.15rem] text-ink-4" />
                    <input
                      id="hero-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      className="h-12 w-full bg-transparent pl-10 pr-3 text-[1rem] text-ink outline-none placeholder:text-ink-4"
                      placeholder={focused || query ? t('landing.searchPlaceholder') : ''}
                      autoComplete="off"
                    />
                    {!focused && !query && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-10 truncate pr-3 text-[1rem] text-ink-4"
                      >
                        {typed}
                        <span className="ml-0.5 inline-block w-px animate-caret-blink border-l border-ink-3 align-middle" />
                      </span>
                    )}
                  </div>
                  <Button type="submit" size="lg" className="shrink-0">
                    {t('common.findSchemes')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 register">{t('landing.freeNote')}</p>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="register">{t('landing.orStartHere')}</span>
                <Button variant="outline" size="sm" onClick={() => setQuickMatchOpen(true)}>
                  <ListChecks className="h-4 w-4 text-ink-3" />
                  {t('landing.answer3')}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="#who">
                    <LayoutGrid className="h-4 w-4 text-ink-3" />
                    {t('nav.categories')}
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="#languages">
                    <MessagesSquare className="h-4 w-4 text-ink-3" />
                    {t('assistant.eyebrow')}
                  </a>
                </Button>
              </div>
            </div>

            {/* The register's own index card — live counts, not a stat banner. */}
            <aside className="animate-rise-in rounded-lg border border-rule bg-surface p-5 shadow-card">
              <p className="register mb-3">{t('landing.indexTitle')}</p>
              <dl className="divide-y divide-rule">
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="flex items-center gap-2 text-[0.875rem] text-ink-2">
                    <span aria-hidden className="h-3 w-[3px] rounded-full bg-central" />
                    {t('landing.centralOrders')}
                  </dt>
                  <dd className="font-display text-[1.0625rem] font-semibold text-ink">
                    {counts?.levels?.central ?? '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="flex items-center gap-2 text-[0.875rem] text-ink-2">
                    <span aria-hidden className="h-3 w-[3px] rounded-full bg-state" />
                    {t('landing.stateOrders')}
                  </dt>
                  <dd className="font-display text-[1.0625rem] font-semibold text-ink">
                    {counts?.levels?.state ?? '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-[0.875rem] text-ink-2">{t('landing.statesCovered')}</dt>
                  <dd className="font-display text-[1.0625rem] font-semibold text-ink">
                    {totals.states || '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-[0.875rem] text-ink-2">{t('landing.navLanguages')}</dt>
                  <dd className="font-display text-[1.0625rem] font-semibold text-ink">
                    {ALL_LANGUAGES.length}
                  </dd>
                </div>
              </dl>
              <p className="hair-top mt-1 pt-3 register">
                {lastVerified
                  ? t('landing.lastVerified', { date: formatDate(lastVerified) })
                  : t('landing.awaitingConnection')}
              </p>
            </aside>
          </div>
        </section>

        {/* ---------------- Who are you: the register index --------------- */}
        <section id="who" className="hair-top scroll-mt-16 bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="register mb-1.5">{t('categories.eyebrow')}</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  {t('categories.title')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => enter('/categories')}
                className="text-[0.875rem] font-medium text-sanction underline-offset-4 hover:underline"
              >
                {t('landing.allCategories')}
              </button>
            </div>

            <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {SEGMENTS.map((segment) => {
                const Icon = segment.icon;
                const count = counts?.segments?.[segment.slug];
                return (
                  <li key={segment.slug}>
                    <button
                      type="button"
                      onClick={() => enter(`/categories/${segment.slug}`)}
                      className="group flex h-full w-full flex-col rounded-lg border border-rule bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-sanction-edge hover:bg-sanction-tint/40 hover:shadow-card"
                    >
                      <span className="flex items-center justify-between">
                        <Icon
                          className="h-5 w-5 text-ink-3 transition-colors group-hover:text-sanction"
                          strokeWidth={1.6}
                        />
                        {typeof count === 'number' && (
                          <span className="font-mono text-micro text-ink-4">{count}</span>
                        )}
                      </span>
                      <span className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                        {t(segment.labelKey)}
                      </span>
                      <span className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                        {t(segment.blurbKey)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------------- What you actually receive --------------------- */}
        <section id="benefits" className="hair-top scroll-mt-16">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <p className="register mb-1.5">{t('landing.benefitsEyebrow')}</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              {t('landing.benefitsTitle')}
            </h2>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2">
              {t('landing.benefitsDesc')}
            </p>

            <ul className="mt-8 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
              {BENEFIT_TYPES.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <li key={benefit.slug} className="bg-surface p-5">
                    <Icon className="h-5 w-5 text-sanction" strokeWidth={1.6} />
                    <h3 className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                      {t(benefit.labelKey)}
                    </h3>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                      {t(benefit.blurbKey)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------------- The register, live ---------------------------- */}
        <section className="hair-top bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <div>
                <p className="register mb-1.5">{t('landing.liveEyebrow')}</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  {t('landing.liveTitle')}
                </h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
                  {t('landing.liveDesc')}
                </p>
                <Button variant="outline" size="sm" className="mt-5" onClick={() => enter('/search')}>
                  {t('landing.openFullRegister')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {recentLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="record p-5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-3 h-5 w-2/3" />
                      <Skeleton className="mt-2 h-4 w-full" />
                    </div>
                  ))}

                {!recentLoading &&
                  recent?.map((scheme) => <SchemeRecord key={scheme.slug} scheme={scheme} />)}

                {!recentLoading && !recent?.length && (
                  <p className="rounded-lg border border-dashed border-rule-strong p-6 text-[0.875rem] text-ink-2">
                    {t('landing.registerUnreachable')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- How it works: a real sequence ----------------- */}
        <section id="how" className="hair-top scroll-mt-16">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <p className="register mb-1.5">{t('landing.howEyebrow')}</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              {t('landing.howTitle')}
            </h2>

            <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
              {STEP_KEYS.map((step, i) => (
                <li key={step} className="bg-surface p-5">
                  <span className="font-mono text-[0.8125rem] font-medium text-sanction">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-display text-[1rem] font-semibold text-ink">
                    {t(`landing.${step}Title`)}
                  </h3>
                  <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
                    {t(`landing.${step}Body`)}
                  </p>
                </li>
              ))}
            </ol>

            {/* The limits, stated on the way in rather than in the footer. */}
            <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3">
              <div className="bg-surface p-5">
                <ShieldCheck className="h-5 w-5 text-sanction" strokeWidth={1.6} />
                <h3 className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                  {t('landing.limit1Title')}
                </h3>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                  {t('landing.limit1Body')}
                </p>
              </div>
              <div className="bg-surface p-5">
                <FileText className="h-5 w-5 text-sanction" strokeWidth={1.6} />
                <h3 className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                  {t('landing.limit2Title')}
                </h3>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                  {t('landing.limit2Body')}
                </p>
              </div>
              <div className="bg-surface p-5">
                <LanguagesIcon className="h-5 w-5 text-sanction" strokeWidth={1.6} />
                <h3 className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                  {t('landing.limit3Title')}
                </h3>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                  {t('landing.limit3Body', { count: ALL_LANGUAGES.length })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Languages ------------------------------------- */}
        <section id="languages" className="hair-top scroll-mt-16 bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center">
              <div>
                <p className="register mb-1.5">{t('landing.langEyebrow')}</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  {t('landing.langTitle', { count: ALL_LANGUAGES.length })}
                </h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
                  {t('landing.langDesc')}
                </p>
              </div>

              <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-4">
                {ALL_LANGUAGES.map((lang) => (
                  <li key={lang.code} className="bg-surface px-4 py-3.5">
                    <p
                      className="font-display text-[1rem] font-semibold text-ink"
                      lang={lang.code}
                      dir={lang.rtl ? 'rtl' : undefined}
                    >
                      {lang.nativeName}
                    </p>
                    <p className="register mt-0.5">{lang.name}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------- Questions ------------------------------------- */}
        <section id="questions" className="hair-top scroll-mt-16">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <p className="register mb-1.5">{t('landing.faqEyebrow')}</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              {t('landing.faqTitle')}
            </h2>

            <dl className="mt-8 grid gap-x-10 gap-y-7 md:grid-cols-2">
              {FAQ_KEYS.map((faq) => (
                <div key={faq} className="hair-top pt-5">
                  <dt className="font-display text-[1rem] font-semibold text-ink">
                    {t(`landing.${faq}Q`)}
                  </dt>
                  <dd className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">
                    {t(`landing.${faq}A`)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------- Closing prompt -------------------------------- */}
        <section className="hair-top">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-lg border border-sanction-edge bg-sanction-tint p-8">
              <div className="max-w-lg">
                <h2 className="font-display text-xl font-semibold text-sanction-deep">
                  {t('landing.closingTitle')}
                </h2>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-sanction-deep/80">
                  {t('landing.closingDesc')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="lg" onClick={() => setQuickMatchOpen(true)}>
                  {t('landing.answer3')}
                </Button>
                <Button size="lg" asChild>
                  <Link to="/login">
                    {t('landing.signInToBegin')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />

      <QuickMatchDialog open={quickMatchOpen} onOpenChange={setQuickMatchOpen} />
    </div>
  );
};
