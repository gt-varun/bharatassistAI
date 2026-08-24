import { useTranslation } from 'react-i18next';
import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ListChecks, Printer, Share2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { isNative } from '../native/platform';
import { printOrShare } from '../native/files';
import { cn } from '../lib/utils';

export interface ChecklistItemData {
  label: string;
  status: 'have' | 'missing' | 'required' | 'pending' | 'completed' | 'not_required' | 'not_applicable';
  howToObtain: string;
  mandatory: boolean;
}

export interface ChecklistResponse {
  schemeId: string;
  schemeName: string;
  items: ChecklistItemData[];
}

export const ChecklistPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = searchParams.get('scheme') ?? '';

  const { slugs } = useSavedSchemes();
  const { schemes: savedSchemes } = useSchemeRecords(slugs);

  // Fetch Checklist API
  const {
    data: checklistData,
    isLoading,
    isError
  } = useQuery<ChecklistResponse>({
    queryKey: ['checklist', slug],
    queryFn: async () => {
      const res = await apiClient.get(`/checklist/${slug}`);
      return res.data?.data;
    },
    enabled: Boolean(slug)
  });

  // Patch Checklist API Mutation
  const updateChecklistMutation = useMutation<
    ChecklistResponse,
    Error,
    { label: string; status: 'have' | 'missing' }[]
  >({
    mutationFn: async (updatedItems) => {
      const res = await apiClient.patch(`/checklist/${slug}`, { items: updatedItems });
      return res.data?.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['checklist', slug], data);
    }
  });

  const toggleItemStatus = (item: ChecklistItemData) => {
    if (!checklistData) return;
    const newStatus = item.status === 'have' || item.status === 'completed' ? 'missing' : 'have';

    // Optimistic cache update
    const nextItems = checklistData.items.map((i) =>
      i.label === item.label ? { ...i, status: newStatus as any } : i
    );
    queryClient.setQueryData(['checklist', slug], { ...checklistData, items: nextItems });

    // Send API update
    updateChecklistMutation.mutate([{ label: item.label, status: newStatus }]);
  };

  // 1. Picker Screen if no scheme is specified
  if (!slug) {
    return (
      <PageBody>
        <PageHeader
          eyebrow={t('checklist.eyebrow')}
          title={t('checklist.title')}
          description={t('checklist.desc')}
        />
        <div className="mt-8">
          {savedSchemes.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={t('checklist.pickScheme')}
              description={t('checklist.pickSchemeDesc')}
              action={
                <Button asChild>
                  <Link to="/search">{t('common.findSchemes')}</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <h2 className="register text-ink-2">{t('checklist.fromSaved')}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {savedSchemes.map((s) => (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ scheme: s.slug })}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-rule bg-surface p-4 text-left transition-colors hover:border-sanction-edge hover:bg-sanction-tint/40"
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-[0.9375rem] font-semibold text-ink">
                          {s.name}
                        </span>
                        <span className="register block text-ink-3">
                          {s.requiredDocuments?.length ?? 0} documents recorded
                        </span>
                      </span>
                      <ListChecks className="h-4 w-4 shrink-0 text-ink-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PageBody>
    );
  }

  // 2. Loading State
  if (isLoading) {
    return (
      <PageBody>
        <LoadingState message="Loading document checklist from server..." rows={3} />
      </PageBody>
    );
  }

  // 3. Error State
  if (isError || !checklistData) {
    return (
      <PageBody>
        <EmptyState
          title={t('checklist.failed')}
          description={t('checklist.failedDesc')}
          action={
            <Button variant="outline" asChild>
              <Link to="/search">{t('nav.search')}</Link>
            </Button>
          }
        />
      </PageBody>
    );
  }

  const items = checklistData.items || [];
  const haveCount = items.filter((i) => i.status === 'have' || i.status === 'completed').length;

  /**
   * Take the list away with you.
   *
   * On the web that means the print dialog, as it always has. In the app
   * `window.print()` is a no-op in the WebView, so the button would be a
   * dead control — instead the same list goes to the share sheet as text,
   * which reaches the places a phone actually has: a printing app, a
   * message to whoever is helping with the paperwork, or a note.
   */
  const takeListAway = () => {
    if (!isNative()) {
      window.print();
      return;
    }

    const lines = items.map((item) => {
      const done = item.status === 'have' || item.status === 'completed';
      const mark = done ? '[x]' : '[ ]';
      const need = item.mandatory ? 'Required' : 'Optional';
      return `${mark} ${item.label} — ${need}`;
    });

    void printOrShare({
      title: checklistData.schemeName,
      text: [
        checklistData.schemeName,
        `${haveCount} of ${items.length} documents ready`,
        '',
        ...lines
      ].join('\n')
    });
  };
  const missingItems = items.filter((i) => i.status !== 'have' && i.status !== 'completed' && i.status !== 'not_applicable' && i.status !== 'not_required');

  return (
    <PageBody>
      <Link
        to={`/schemes/${slug}`}
        className="no-print mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {checklistData.schemeName}
      </Link>

      <PageHeader
        eyebrow={t('checklist.eyebrow')}
        title={checklistData.schemeName}
        description={
          items.length
            ? `${haveCount} of ${items.length} documents ready. Tick each one off as you collect it.`
            : undefined
        }
        actions={
          items.length > 0 && (
            <Button variant="outline" size="sm" onClick={takeListAway} className="no-print">
              {isNative() ? (
                <Share2 className="h-4 w-4 text-ink-3" />
              ) : (
                <Printer className="h-4 w-4 text-ink-3" />
              )}
              {isNative() ? t('checklist.shareList') : t('checklist.print')}
            </Button>
          )
        }
      />

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={ListChecks}
            title={t('checklist.noneRecorded')}
            description={t('checklist.noneRecordedDesc')}
            action={
              <Button variant="outline" asChild>
                <Link to={`/schemes/${slug}`}>{t('checklist.backToScheme')}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="mt-8 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule">
              <div
                className="h-full rounded-full bg-sanction transition-[width] duration-300"
                style={{ width: `${(haveCount / items.length) * 100}%` }}
              />
            </div>
            <span className="register-strong shrink-0">
              {haveCount}/{items.length} Ready
            </span>
          </div>

          {/* Checklist List */}
          <ul className="mt-8 divide-y divide-rule border-y border-rule">
            {items.map((item) => {
              const isDone = item.status === 'have' || item.status === 'completed';
              const isNotApplicable = item.status === 'not_applicable' || item.status === 'not_required';

              return (
                <li key={item.label} className="flex gap-3.5 py-4">
                  <Checkbox
                    id={`doc-${item.label}`}
                    checked={isDone}
                    disabled={isNotApplicable}
                    onCheckedChange={() => toggleItemStatus(item)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`doc-${item.label}`}
                    className={cn('min-w-0 cursor-pointer', isNotApplicable && 'cursor-default opacity-60')}
                  >
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={cn(
                          'font-display text-[0.9375rem] font-semibold',
                          isDone ? 'text-ink-3 line-through' : 'text-ink'
                        )}
                      >
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          'register-strong text-micro',
                          isNotApplicable
                            ? 'text-ink-4'
                            : item.mandatory
                              ? 'text-seal'
                              : 'text-ink-3'
                        )}
                      >
                        {isNotApplicable
                          ? item.status === 'not_applicable'
                            ? 'Not Applicable'
                            : 'Not Required'
                          : item.mandatory
                            ? 'Required'
                            : 'Optional'}
                      </span>
                    </span>
                    {item.howToObtain && !isDone && (
                      <span className="mt-1 block text-[0.875rem] leading-relaxed text-ink-2">
                        {item.howToObtain}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>

          {/* Bottom Summary Banner */}
          {missingItems.length === 0 ? (
            <div className="mt-8 rounded-lg border border-sanction-edge bg-sanction-tint p-5">
              <p className="flex items-center gap-2 font-display text-[1rem] font-semibold text-sanction-deep">
                <CheckCircle2 className="h-5 w-5 text-sanction" />
                You have collected all required documents
              </p>
              <p className="mt-1 text-[0.875rem] text-sanction-deep/80">
                You can now proceed to apply on the official government portal.
              </p>
              <Button className="no-print mt-4" asChild>
                <Link to={`/schemes/${slug}`}>{t('checklist.backToScheme')}</Link>
              </Button>
            </div>
          ) : (
            <p className="mt-8 flex items-center gap-2 text-[0.875rem] text-ink-2">
              <AlertCircle className="h-4 w-4 text-ochre shrink-0" />
              {missingItems.length} document{missingItems.length > 1 ? 's' : ''} still missing. Tick each one off as you collect it.
            </p>
          )}
        </>
      )}
    </PageBody>
  );
};
