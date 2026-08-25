import { useTranslation } from 'react-i18next';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, CalendarClock, CheckCircle2, Clock, FileCheck2, ListFilter } from 'lucide-react';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { SchemeRecord } from '../components/scheme/SchemeRecord';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useSavedSchemes, SavedSchemeStatus } from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { useOptionalAuth } from '../auth/AuthContext';
import { daysUntil, formatDate } from '../lib/format';
import { cn } from '../lib/utils';

type FilterTab = 'all' | SavedSchemeStatus;

const TABS: { id: FilterTab; label: string; icon?: React.ElementType }[] = [
  { id: 'all', label: 'All' },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'eligibility_checked', label: 'Eligibility Checked', icon: FileCheck2 },
  { id: 'application_in_progress', label: 'In Progress', icon: Clock },
  { id: 'applied', label: 'Applied', icon: CheckCircle2 }
];

const STATUS_LABELS: Record<SavedSchemeStatus, string> = {
  saved: 'Saved',
  eligibility_checked: 'Eligibility Checked',
  application_in_progress: 'In Progress',
  applied: 'Applied'
};

export const SavedSchemesPage: React.FC = () => {
  const { t } = useTranslation();
  const auth = useOptionalAuth();
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const { slugs, items, isSaved, getStatus, updateStatus, toggle, clear, isInitializing } = useSavedSchemes();
  const { schemes, isLoading } = useSchemeRecords(slugs);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const counts = useMemo(() => {
    const res: Record<FilterTab, number> = {
      all: items.length,
      saved: 0,
      eligibility_checked: 0,
      application_in_progress: 0,
      applied: 0
    };
    for (const item of items) {
      if (item.status && item.status in res) {
        res[item.status as FilterTab]++;
      } else {
        res.saved++;
      }
    }
    return res;
  }, [items]);

  const filteredSchemes = useMemo(() => {
    if (activeTab === 'all') return schemes;
    return schemes.filter((scheme) => getStatus(scheme.slug) === activeTab);
  }, [schemes, activeTab, getStatus]);

  return (
    <PageBody>
      <PageHeader
        eyebrow={`${slugs.length} ${slugs.length === 1 ? 'scheme' : 'schemes'}`}
        title={t('savedPage.title')}
        description={t('savedPage.desc')}
        actions={
          slugs.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Remove all
            </Button>
          )
        }
      />

      {!isAuthenticated && slugs.length > 0 && (
        <p className="mt-6 rounded-md border border-rule-strong bg-surface px-4 py-3 text-[0.875rem] text-ink-2">
          This list lives on this device only.{' '}
          <Link to="/login" className="font-medium text-sanction underline-offset-4 hover:underline">
            Sign in
          </Link>{' '}
          to keep it when you switch phone or browser.
        </p>
      )}

      {/* Status Filter Tabs */}
      {slugs.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-rule pb-3">
          {TABS.map((tab) => {
            const count = counts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
                  isActive
                    ? 'bg-sanction text-surface'
                    : 'bg-surface text-ink-2 hover:bg-rule-soft hover:text-ink'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-micro',
                    isActive ? 'bg-white/20 text-white' : 'bg-rule text-ink-3'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        {isLoading && slugs.length > 0 && <LoadingState message="Loading your saved schemes" rows={2} />}

        {slugs.length === 0 && !isInitializing && (
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Bookmark a scheme while you gather its documents and it will wait for you here."
            action={
              <Button asChild>
                <Link to="/search">Find schemes</Link>
              </Button>
            }
          />
        )}

        {!isLoading && slugs.length > 0 && filteredSchemes.length === 0 && (
          <EmptyState
            icon={ListFilter}
            title={`No schemes in "${TABS.find((t) => t.id === activeTab)?.label}"`}
            description="Move a scheme to this status or switch tabs to see other saved schemes."
            action={
              <Button variant="outline" onClick={() => setActiveTab('all')}>
                View all saved schemes
              </Button>
            }
          />
        )}

        {!isLoading && filteredSchemes.length > 0 && (
          <ul className="space-y-4">
            {filteredSchemes.map((scheme) => {
              const currentStatus = getStatus(scheme.slug);
              const daysLeft = daysUntil(scheme.deadline);
              const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
              const isExpired = daysLeft !== null && daysLeft < 0;

              return (
                <li key={scheme.slug} className="overflow-hidden rounded-xl border border-rule bg-surface shadow-card">
                  {/* Deadline Alert Banner if closing soon */}
                  {isClosingSoon && (
                    <div className="flex items-center gap-2 border-b border-seal-edge bg-seal-tint px-5 py-2 text-[0.8125rem] font-semibold text-seal">
                      <CalendarClock className="h-4 w-4 shrink-0" />
                      <span>
                        {daysLeft === 0 ? 'Application closes today!' : `Deadline approaching: ${daysLeft} day${daysLeft === 1 ? '' : 's'} left (${formatDate(scheme.deadline)})`}
                      </span>
                    </div>
                  )}

                  {isExpired && (
                    <div className="flex items-center gap-2 border-b border-rule bg-rule-soft px-5 py-2 text-[0.8125rem] font-medium text-ink-3">
                      <CalendarClock className="h-4 w-4 shrink-0" />
                      <span>Application deadline passed on {formatDate(scheme.deadline)}</span>
                    </div>
                  )}

                  <SchemeRecord
                    scheme={scheme}
                    saved={isSaved(scheme.slug)}
                    onToggleSave={(s) => toggle(s.slug)}
                    className="border-none shadow-none"
                  />

                  {/* Status update bar at the bottom of the card */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-rule-soft/50 px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.8125rem] font-medium text-ink-2">Status:</span>
                      <Select
                        value={currentStatus}
                        onValueChange={(val) => updateStatus(scheme.slug, val as SavedSchemeStatus)}
                      >
                        <SelectTrigger className="h-8 w-44 bg-surface text-[0.8125rem]">
                          <SelectValue>{STATUS_LABELS[currentStatus]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saved">Saved</SelectItem>
                          <SelectItem value="eligibility_checked">Eligibility Checked</SelectItem>
                          <SelectItem value="application_in_progress">In Progress</SelectItem>
                          <SelectItem value="applied">Applied</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/schemes/${scheme.slug}`}>View Details</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/checklist?scheme=${scheme.slug}`}>Checklist</Link>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageBody>
  );
};
