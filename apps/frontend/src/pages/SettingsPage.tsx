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
import { saveTextFile } from '../native/files';
import { cn } from '../lib/utils';

const TEXT_SCALES = [
  { id: 'normal', labelKey: 'settings.normal', sample: '1×' },
  { id: 'large', labelKey: 'settings.large', sample: '1.15×' },
  { id: 'xlarge', labelKey: 'settings.xlarge', sample: '1.3×' }
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

  /**
   * The DPDP export.
   *
   * In a browser this is still a Blob and a download, exactly as before.
   * In the mobile app that pair does nothing — `download` is not
   * implemented in an Android WebView — so `saveTextFile` writes the file
   * to the app's documents directory and offers it to the share sheet.
   * An export the citizen cannot actually obtain would not be an export.
   */
  const download = async (payload: unknown) => {
    await saveTextFile(
      'bharatassist-my-data.json',
      JSON.stringify(payload, null, 2),
      { mimeType: 'application/json', dialogTitle: t('settings.downloadData') }
    );
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
      await download({ scope: 'this device only', ...local });
      return;
    }

    setBusy('export');
    try {
      const res = await apiClient.get('/profile/export');
      await download({ ...res.data?.data, device: local });
    } catch {
      setError(t('settings.exportFailed'));
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
      setError(t('settings.deleteFailed'));
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
          title={t('settings.language')}
          description={t('settings.languageCount', { count: getAvailableLanguages().length })}
        >
          <LanguageSelector variant="full" />
        </Row>

        <Row
          title={t('settings.textSize')}
          description={t('settings.textSizeDesc')}
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
                <span className="block text-[0.875rem] font-medium">{t(option.labelKey)}</span>
                <span className="register block">{option.sample}</span>
              </button>
            ))}
          </div>
        </Row>

        {isAuthenticated && (
          <Row
            title={t('settings.reminders')}
            description={t('settings.remindersDesc')}
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
                {t('settings.deadlineReminders')}
              </span>
              <span className="register-strong">{notifications ? t('settings.on') : t('settings.off')}</span>
            </button>
          </Row>
        )}

        <Row
          title={t('settings.exportTitle')}
          description={
            isAuthenticated ? t('settings.exportDescAccount') : t('settings.exportDescDevice')
          }
        >
          <Button variant="outline" onClick={exportData} disabled={busy === 'export'}>
            <Download className="h-4 w-4 text-ink-3" />
            {busy === 'export' ? t('settings.preparing') : t('settings.downloadData')}
          </Button>
        </Row>

        <Row
          title={isAuthenticated ? t('settings.deleteAccountTitle') : t('settings.deleteDeviceTitle')}
          description={
            isAuthenticated ? t('settings.deleteAccountDesc') : t('settings.deleteDeviceDesc')
          }
        >
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-[0.875rem] text-ink-2">
                {isAuthenticated ? t('settings.confirmAccount') : t('settings.confirmDevice')}
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={deleteEverything} disabled={busy === 'delete'}>
                  {busy === 'delete' ? t('settings.deleting') : t('settings.confirmDelete')}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  {t('settings.keepData')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              {isAuthenticated ? t('settings.deleteAccountBtn') : t('settings.deleteDataBtn')}
            </Button>
          )}
        </Row>
      </div>

      {error && <p className="mt-4 text-[0.875rem] text-seal">{error}</p>}

      <p className="mt-8 text-[0.8125rem] leading-relaxed text-ink-3">
        {t('settings.dpdpNote')}
      </p>
    </PageBody>
  );
};
