import React, { useEffect, useMemo, useRef, useState } from 'react';
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

/** Real phrasings citizens use — the placeholder teaches the search. */
const EXAMPLE_QUERIES = [
  'I am a farmer in Karnataka with two acres',
  'scholarship for a BSc student, family income under 2 lakh',
  'loan for a woman starting a tailoring business',
  'pension for my father, he is 68',
  'help with buying a drip irrigation set'
];

/** The journey is a real sequence, so it is numbered. */
const STEPS = [
  {
    title: 'Describe your situation',
    body: 'Type it the way you would say it. No scheme names, no government vocabulary needed.'
  },
  {
    title: 'See what you qualify for',
    body: 'Answer a short set of plain questions and get a clear yes, partly, or no — with the reason.'
  },
  {
    title: 'Collect your documents',
    body: 'Get the exact list for your case, including where to obtain anything you are missing.'
  },
  {
    title: 'Apply on the official portal',
    body: 'We hand you over ready. The government portal remains the only place you file.'
  }
];

const FAQS = [
  {
    q: 'Do I need an account?',
    a: 'Yes. Signing in with your mobile number opens the register and lets it remember your saved schemes, your document checklist and your deadlines between visits. There is no separate sign-up — the same number creates the account.'
  },
  {
    q: 'Does BharatAssist AI apply on my behalf?',
    a: 'Never. We take you as far as a complete document list and the correct official link. The government portal stays the only place an application is filed, and we never ask for the credentials to one.'
  },
  {
    q: 'Where does the scheme information come from?',
    a: 'Every record traces back to an official government notification. Each one carries the issuing department, the notification reference and the date it was last checked against that source.'
  },
  {
    q: 'How current is it?',
    a: 'Records are re-checked against their source on a rolling basis. Anything unchecked for more than 90 days is flagged in the list rather than quietly left to age, so you can see the age of what you are reading.'
  },
  {
    q: 'What does it cost?',
    a: 'Nothing. Government schemes are a public entitlement and finding them should not carry a fee, an agent or a middleman.'
  },
  {
    q: 'What do you do with my mobile number?',
    a: 'It attaches your saved schemes to you and nothing else. We do not sell it or use it for marketing, and you can export or delete everything you have stored from Settings at any time.'
  }
];

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
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [quickMatchOpen, setQuickMatchOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const typed = useTypedPlaceholder(EXAMPLE_QUERIES);

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
        Skip to content
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
                Central and state government schemes
              </p>

              <h1 className="mt-5 text-balance font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[3.25rem]">
                Tell us your situation.
                <br />
                <span className="text-sanction">We&apos;ll find the schemes you can claim.</span>
              </h1>

              <p className="mt-5 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-ink-2">
                Central and state benefits are scattered across hundreds of portals, written in
                language most people cannot self-assess against. Search all of them here, in yours.
              </p>

              {/* The hero object: one field, plain language. */}
              <form onSubmit={runSearch} className="mt-8" role="search">
                <label htmlFor="hero-search" className="sr-only">
                  Describe your situation to find schemes
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
                      placeholder={focused || query ? 'Describe your situation' : ''}
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
                    Find schemes
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 register">
                  Sign in with your mobile number to open the register — it is free
                </p>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="register">Or start here</span>
                <Button variant="outline" size="sm" onClick={() => setQuickMatchOpen(true)}>
                  <ListChecks className="h-4 w-4 text-ink-3" />
                  Answer 3 questions
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="#who">
                    <LayoutGrid className="h-4 w-4 text-ink-3" />
                    Browse by category
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="#languages">
                    <MessagesSquare className="h-4 w-4 text-ink-3" />
                    Ask in your language
                  </a>
                </Button>
              </div>
            </div>

            {/* The register's own index card — live counts, not a stat banner. */}
            <aside className="animate-rise-in rounded-lg border border-rule bg-surface p-5 shadow-card">
              <p className="register mb-3">What is on the register</p>
              <dl className="divide-y divide-rule">
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="flex items-center gap-2 text-[0.875rem] text-ink-2">
                    <span aria-hidden className="h-3 w-[3px] rounded-full bg-central" />
                    Central orders
                  </dt>
                  <dd className="font-display text-[1.0625rem] font-semibold text-ink">
                    {counts?.levels?.central ?? '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="flex items-center gap-2 text-[0.875rem] text-ink-2">
                    <span aria-hidden className="h-3 w-[3px] rounded-full bg-state" />
                    State orders
                  </dt>
                  <dd className="font-display text-[1.0625rem] font-semibold text-ink">
                    {counts?.levels?.state ?? '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-[0.875rem] text-ink-2">States covered</dt>
                  <dd className="font-display text-[1.0625rem] font-semibold text-ink">
                    {totals.states || '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-[0.875rem] text-ink-2">Languages</dt>
                  <dd className="font-display text-[1.0625rem] font-semibold text-ink">
                    {ALL_LANGUAGES.length}
                  </dd>
                </div>
              </dl>
              <p className="hair-top mt-1 pt-3 register">
                {lastVerified ? `Last verified ${formatDate(lastVerified)}` : 'Awaiting connection'}
              </p>
            </aside>
          </div>
        </section>

        {/* ---------------- Who are you: the register index --------------- */}
        <section id="who" className="hair-top scroll-mt-16 bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="register mb-1.5">Browse by who you are</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  Start from your situation
                </h2>
              </div>
              <button
                type="button"
                onClick={() => enter('/categories')}
                className="text-[0.875rem] font-medium text-sanction underline-offset-4 hover:underline"
              >
                All categories
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
                        {segment.label}
                      </span>
                      <span className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                        {segment.blurb}
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
            <p className="register mb-1.5">What a scheme gives you</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Not every benefit is a cash transfer
            </h2>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2">
              A scheme might pay money into your account, or it might cut the price of a pump set,
              write off a college fee, or open a training place. The register tells you which,
              before you spend a day on the paperwork.
            </p>

            <ul className="mt-8 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-5">
              {BENEFIT_TYPES.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <li key={benefit.slug} className="bg-surface p-5">
                    <Icon className="h-5 w-5 text-sanction" strokeWidth={1.6} />
                    <h3 className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                      {benefit.label}
                    </h3>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                      {benefit.blurb}
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
                <p className="register mb-1.5">On the register now</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  Every entry traces back to an official notification
                </h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
                  Each record carries the department that issued it, the date it was last checked
                  against the source, and the notification reference. Anything unchecked for more
                  than 90 days is flagged in the list rather than quietly left to age.
                </p>
                <Button variant="outline" size="sm" className="mt-5" onClick={() => enter('/search')}>
                  Open the full register
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
                    The register is not reachable right now. Search will work again once the
                    connection returns.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- How it works: a real sequence ----------------- */}
        <section id="how" className="hair-top scroll-mt-16">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <p className="register mb-1.5">From not knowing to ready to apply</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Four steps, and we stop before the form
            </h2>

            <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="bg-surface p-5">
                  <span className="font-mono text-[0.8125rem] font-medium text-sanction">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-display text-[1rem] font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">{step.body}</p>
                </li>
              ))}
            </ol>

            {/* The limits, stated on the way in rather than in the footer. */}
            <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3">
              <div className="bg-surface p-5">
                <ShieldCheck className="h-5 w-5 text-sanction" strokeWidth={1.6} />
                <h3 className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                  We never file for you
                </h3>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                  No agent, no middleman, no fee. The official portal is the only place an
                  application is submitted, and we never ask for your login to one.
                </p>
              </div>
              <div className="bg-surface p-5">
                <FileText className="h-5 w-5 text-sanction" strokeWidth={1.6} />
                <h3 className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                  Sourced, dated, checkable
                </h3>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                  Every record links to the government notification it came from, so you can read
                  the original order yourself.
                </p>
              </div>
              <div className="bg-surface p-5">
                <LanguagesIcon className="h-5 w-5 text-sanction" strokeWidth={1.6} />
                <h3 className="mt-3 font-display text-[0.9375rem] font-semibold text-ink">
                  In the language you think in
                </h3>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-3">
                  Ask a question in {ALL_LANGUAGES.length} languages and get the answer back in the
                  same one.
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
                <p className="register mb-1.5">Read it in yours</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  {ALL_LANGUAGES.length} languages, not just English
                </h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
                  Eligibility rules are hard enough in your own language and close to unreadable in
                  someone else&apos;s. Switch at any time from the selector in the corner — the
                  whole interface follows, including the assistant.
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
            <p className="register mb-1.5">Before you start</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Questions people ask first
            </h2>

            <dl className="mt-8 grid gap-x-10 gap-y-7 md:grid-cols-2">
              {FAQS.map((faq) => (
                <div key={faq.q} className="hair-top pt-5">
                  <dt className="font-display text-[1rem] font-semibold text-ink">{faq.q}</dt>
                  <dd className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">{faq.a}</dd>
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
                  Two minutes is usually enough
                </h2>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-sanction-deep/80">
                  Most people find something they qualify for and did not know existed on their
                  first search.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="lg" onClick={() => setQuickMatchOpen(true)}>
                  Answer 3 questions
                </Button>
                <Button size="lg" asChild>
                  <Link to="/login">
                    Sign in to begin
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
