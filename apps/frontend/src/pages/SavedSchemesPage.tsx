import { useTranslation } from 'react-i18next';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, Bookmark } from 'lucide-react';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { SchemeRecord } from '../components/scheme/SchemeRecord';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import {
  SAVED_STATUSES,
  useSavedSchemes,
  type SavedStatus
} from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { useAuth } from '../auth/AuthContext';
import { daysUntil, formatDate } from '../lib/format';
import { cn } from '../lib/utils';

type Tab = 'all' | SavedStatus;

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'all', labelKey: 'savedPage.statusAll' },
  ...SAVED_STATUSES.map((s) => ({ id: s.id as Tab, labelKey: s.labelKey }))
];

/** Inside this many days a deadline stops being information and becomes a warning. */
const REMINDER_WINDOW_DAYS = 30;

const DeadlineMark: React.FC<{ deadline: string | Date | null }> = ({ deadline }) => {
  const { t } = useTranslation();
  const days = daysUntil(deadline);
  if (days === null) return null;

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-3">
        <AlarmClock className="h-3.5 w-3.5" />
        {t('savedPage.closedOn', { date: formatDate(deadline) })}
      </span>
    );
  }

  const urgent = days <= REMINDER_WINDOW_DAYS;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[0.8125rem]',
        urgent ? 'font-medium text-seal' : 'text-ink-3'
      )}
    >
      <AlarmClock className="h-3.5 w-3.5" />
      {days === 0
        ? t('savedPage.closesToday', { date: formatDate(deadline) })
        : days === 1
          ? t('savedPage.closesTomorrow', { date: formatDate(deadline) })
          : t('savedPage.closesInDays', { count: days, date: formatDate(deadline) })}
    </span>
  );
};

export const SavedSchemesPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { slugs, isSaved, statusOf, toggle, setStatus, clear, isLoading: isSyncing } =
    useSavedSchemes();
  const { schemes, isLoading } = useSchemeRecords(slugs);
  const [tab, setTab] = useState<Tab>('all');

  const counts = useMemo(() => {
    const map: Record<Tab, number> = {
      all: slugs.length,
      saved: 0,
      eligibility_checked: 0,
      application_in_progress: 0,
      applied: 0
    };
    for (const slug of slugs) map[statusOf(slug)] += 1;
    return map;
  }, [slugs, statusOf]);

  const visible = useMemo(
    () => (tab === 'all' ? schemes : schemes.filter((s) => statusOf(s.slug) === tab)),
    [schemes, tab, statusOf]
  );

  // Anything with a real deadline inside the reminder window, soonest first.
  const closingSoon = useMemo(
    () =>
      schemes
        .filter((s) => {
          const days = daysUntil(s.deadline);
          return days !== null && days >= 0 && days <= REMINDER_WINDOW_DAYS;
        })
        .sort((a, b) => (daysUntil(a.deadline) ?? 0) - (daysUntil(b.deadline) ?? 0)),
    [schemes]
  );

  return (
    <PageBody>
      <PageHeader
        eyebrow={t('savedPage.countEyebrow', { count: slugs.length })}
        title={t('savedPage.title')}
        description={t('savedPage.desc')}
        actions={
          slugs.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              {t('savedPage.removeAll')}
            </Button>
          )
        }
      />

      {!isAuthenticated && slugs.length > 0 && (
        <p className="mt-6 rounded-md border border-rule-strong bg-surface px-4 py-3 text-[0.875rem] text-ink-2">
          {t('savedPage.deviceOnlyHead')}{' '}
          <Link to="/login" className="font-medium text-sanction underline-offset-4 hover:underline">
            {t('common.signIn')}
          </Link>{' '}
          {t('savedPage.deviceOnlyTail')}
        </p>
      )}

      {closingSoon.length > 0 && (
        <div className="mt-6 rounded-md border border-seal/30 bg-seal/5 px-4 py-3">
          <p className="text-[0.875rem] font-medium text-ink">
            {t('savedPage.closingSoon', { count: closingSoon.length })}
          </p>
          <ul className="mt-2 space-y-1">
            {closingSoon.map((scheme) => (
              <li key={scheme.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  to={`/schemes/${scheme.slug}`}
                  className="text-[0.875rem] font-medium text-sanction underline-offset-4 hover:underline"
                >
                  {scheme.name}
                </Link>
                <DeadlineMark deadline={scheme.deadline} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {slugs.length > 0 && (
        <div
          role="tablist"
          aria-label={t('savedPage.statusTabs')}
          className="mt-7 flex flex-wrap gap-2 border-b border-rule pb-3"
        >
          {TABS.map((option) => (
            <button
              key={option.id}
              role="tab"
              type="button"
              aria-selected={tab === option.id}
              onClick={() => setTab(option.id)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-[0.8125rem] transition-colors',
                tab === option.id
                  ? 'border-sanction bg-sanction-tint font-medium text-sanction'
                  : 'border-rule-strong text-ink-2 hover:border-ink-4 hover:text-ink'
              )}
            >
              {t(option.labelKey)}
              <span className="ml-1.5 text-ink-3">{counts[option.id]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {(isSyncing || (isLoading && slugs.length > 0)) && (
          <LoadingState message={t('savedPage.loading')} rows={2} />
        )}

        {slugs.length === 0 && !isSyncing && (
          <EmptyState
            icon={Bookmark}
            title={t('savedPage.emptyTitle')}
            description={t('savedPage.emptyDesc')}
            action={
              <Button asChild>
                <Link to="/search">{t('common.findSchemes')}</Link>
              </Button>
            }
          />
        )}

        {!isLoading && slugs.length > 0 && visible.length === 0 && (
          <EmptyState
            icon={Bookmark}
            title={t('savedPage.emptyStageTitle')}
            description={t('savedPage.emptyStageDesc')}
          />
        )}

        {!isLoading && visible.length > 0 && (
          <ul className="space-y-3">
            {visible.map((scheme) => (
              <li key={scheme.slug}>
                <SchemeRecord
                  scheme={scheme}
                  saved={isSaved(scheme.slug)}
                  onToggleSave={(s) => toggle(s.slug)}
                />
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3 pl-6">
                  <DeadlineMark deadline={scheme.deadline} />
                  <label className="flex items-center gap-2 text-[0.8125rem] text-ink-2">
                    <span>{t('savedPage.stage')}</span>
                    <select
                      value={statusOf(scheme.slug)}
                      onChange={(e) => setStatus(scheme.slug, e.target.value as SavedStatus)}
                      aria-label={t('savedPage.stageAria', { name: scheme.name })}
                      className="rounded-md border border-rule-strong bg-surface px-2 py-1 text-[0.8125rem] text-ink"
                    >
                      {SAVED_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {t(s.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageBody>
  );
};
