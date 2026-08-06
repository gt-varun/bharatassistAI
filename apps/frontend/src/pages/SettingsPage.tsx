import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Trash2 } from 'lucide-react';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { LanguageSelector } from '../components/ui/LanguageSelector';
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
  const { isAuthenticated, signOut } = useAuth();
  const { slugs, clear } = useSavedSchemes();
  const [scale, setScale] = useState<string>(() => localStorage.getItem(SCALE_KEY) ?? 'normal');

  useEffect(() => {
    document.documentElement.dataset.textScale = scale === 'normal' ? '' : scale;
    localStorage.setItem(SCALE_KEY, scale);
  }, [scale]);

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      language: i18n.language,
      textScale: scale,
      savedSchemes: slugs,
      checklist: JSON.parse(localStorage.getItem('bharatassist_checklist') ?? '{}')
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bharatassist-my-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteLocalData = () => {
    clear();
    localStorage.removeItem('bharatassist_checklist');
    if (isAuthenticated) signOut();
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

        <Row
          title="Take your data with you"
          description="Downloads everything held on this device — saved schemes, checklist progress and preferences — as a file you can keep."
        >
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 text-ink-3" />
            Download my data
          </Button>
        </Row>

        <Row
          title="Delete everything"
          description="Clears your saved schemes and checklist progress from this device, and signs you out. This cannot be undone."
        >
          <Button variant="destructive" onClick={deleteLocalData}>
            <Trash2 className="h-4 w-4" />
            Delete my data
          </Button>
        </Row>
      </div>

      <p className="mt-8 text-[0.8125rem] leading-relaxed text-ink-3">
        Under the Digital Personal Data Protection Act you can ask for an export or deletion of
        anything held about you at any time. The controls above do it directly.
      </p>
    </PageBody>
  );
};
