import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BellRing, Download, Trash2 } from 'lucide-react';
import type { User } from '@bharatassist/shared-types';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { LanguageSelector } from '../components/ui/LanguageSelector';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { getAvailableLanguages } from '../i18n/config';
import { cn } from '../lib/utils';

const TEXT_SCALES = [
  { id: 'normal', label: 'Normal', sample: '1×' },
  { id: 'large', label: 'Large', sample: '1.15×' },
  { id: 'xlarge', label: 'Largest', sample: '1.3×' }
] as const;

const SCALE_KEY = 'bharatassist_text_scale';

const Row: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title,
  description,
  children
}) => (
  <div className="grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:items-start">
    <div>
      <h2 className="font-display text-[1rem] font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-md text-[0.875rem] leading-relaxed text-ink-2">{description}</p>
    </div>
    <div>{children}</div>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, deleteAccount } = useAuth();
  const { slugs, clear } = useSavedSchemes();
  const [scale, setScale] = useState<string>(() => localStorage.getItem(SCALE_KEY) ?? 'normal');
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.textScale = scale === 'normal' ? '' : scale;
    localStorage.setItem(SCALE_KEY, scale);
  }, [scale]);

  const { data: account } = useQuery<User | null>({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await apiClient.get('/profile/settings');
      return (res.data?.data ?? null) as User | null;
    },
    enabled: isAuthenticated
  });

  const [notifications, setNotifications] = useState<boolean>(true);
  useEffect(() => {
    if (account) setNotifications(account.notificationsEnabled !== false);
  }, [account]);

  const toggleNotifications = async (next: boolean) => {
    setNotifications(next);
    try {
      await apiClient.patch('/profile/settings', { notificationsEnabled: next });
    } catch {
      setNotifications(!next); // Put the switch back if the server did not take it.
    }
  };

  const download = (payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bharatassist-my-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Signed in, the export is what the server holds — the whole account, not
   * the shadow of it in this browser. As a guest there is no server copy, so
   * the device is the whole record and exporting it is honest.
   */
  const exportData = async () => {
    setError('');
    const local = {
      exportedAt: new Date().toISOString(),
      language: i18n.language,
      textScale: scale,
      savedSchemes: slugs,
      checklist: JSON.parse(localStorage.getItem('bharatassist_checklist') ?? '{}')
    };

    if (!isAuthenticated) {
      download({ scope: 'this device only', ...local });
      return;
    }

    setBusy('export');
    try {
      const res = await apiClient.get('/profile/export');
      download({ ...res.data?.data, device: local });
    } catch {
      setError('Could not reach the server for your account data. Nothing was downloaded.');
    } finally {
      setBusy(null);
    }
  };

  const clearDevice = () => {
    clear();
    localStorage.removeItem('bharatassist_checklist');
  };

  const deleteEverything = async () => {
    setError('');
    if (!isAuthenticated) {
      clearDevice();
      setConfirmDelete(false);
      return;
    }

    setBusy('delete');
    try {
      await deleteAccount();
      clearDevice();
      navigate('/', { replace: true });
    } catch {
      setError('Your account could not be deleted just now. Nothing was removed — please retry.');
      setConfirmDelete(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageBody className="max-w-3xl">
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        description={t('settings.desc')}
      />

      <div className="mt-8 divide-y divide-rule border-y border-rule">
        <Row
          title="Language"
          description={`The whole interface changes, not just scheme text. ${getAvailableLanguages().length} languages are complete enough to offer.`}
        >
          <LanguageSelector variant="full" />
        </Row>

        <Row
          title="Text size"
          description="Make everything larger without zooming the page. Useful if you read government forms at arm's length."
        >
          <div className="flex gap-2">
            {TEXT_SCALES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setScale(option.id)}
                aria-pressed={scale === option.id}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2.5 text-center transition-colors',
                  scale === option.id
                    ? 'border-sanction bg-sanction-tint text-sanction'
                    : 'border-rule-strong text-ink-2 hover:border-ink-4 hover:text-ink'
                )}
              >
                <span className="block text-[0.875rem] font-medium">{option.label}</span>
                <span className="register block">{option.sample}</span>
              </button>
            ))}
          </div>
        </Row>

        {isAuthenticated && (
          <Row
            title="Reminders"
            description="A note when a scheme you saved is about to close, and when a record you rely on changes. Nothing else."
          >
            <button
              type="button"
              role="switch"
              aria-checked={notifications}
              onClick={() => toggleNotifications(!notifications)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                notifications
                  ? 'border-sanction bg-sanction-tint text-sanction'
                  : 'border-rule-strong text-ink-2 hover:border-ink-4 hover:text-ink'
              )}
            >
              <span className="flex items-center gap-2 text-[0.875rem] font-medium">
                <BellRing className="h-4 w-4" />
                Deadline reminders
              </span>
              <span className="register-strong">{notifications ? 'On' : 'Off'}</span>
            </button>
          </Row>
        )}

        <Row
          title="Take your data with you"
          description={
            isAuthenticated
              ? 'Downloads everything held against your account — profile, saved schemes, eligibility answers, checklists and conversations — as a file you can keep.'
              : 'Downloads everything held on this device — saved schemes, checklist progress and preferences — as a file you can keep.'
          }
        >
          <Button variant="outline" onClick={exportData} disabled={busy === 'export'}>
            <Download className="h-4 w-4 text-ink-3" />
            {busy === 'export' ? 'Preparing…' : 'Download my data'}
          </Button>
        </Row>

        <Row
          title={isAuthenticated ? 'Delete your account' : 'Delete everything'}
          description={
            isAuthenticated
              ? 'Erases your account and everything attached to it from our servers, as well as this device. This cannot be undone.'
              : 'Clears your saved schemes and checklist progress from this device. This cannot be undone.'
          }
        >
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-[0.875rem] text-ink-2">
                {isAuthenticated
                  ? 'This permanently deletes your account. There is no way back.'
                  : 'This clears everything saved in this browser.'}
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={deleteEverything} disabled={busy === 'delete'}>
                  {busy === 'delete' ? 'Deleting…' : 'Yes, delete'}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Keep my data
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              {isAuthenticated ? 'Delete my account' : 'Delete my data'}
            </Button>
          )}
        </Row>
      </div>

      {error && <p className="mt-4 text-[0.875rem] text-seal">{error}</p>}

      <p className="mt-8 text-[0.8125rem] leading-relaxed text-ink-3">
        Under the Digital Personal Data Protection Act you can ask for an export or deletion of
        anything held about you at any time. The controls above do it directly.
      </p>
    </PageBody>
  );
};
