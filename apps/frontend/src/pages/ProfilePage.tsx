import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRound } from 'lucide-react';
import type { CitizenProfile } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { EmptyState } from '../components/ui/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../auth/AuthContext';
import { useCitizenProfile } from '../hooks/useCitizenProfile';
import { INCOME_BANDS, SEGMENTS, STATES } from '../lib/taxonomy';

type Draft = Partial<CitizenProfile>;

/** Every field except state is optional — the platform stays useful without them. */
const OPTIONAL_FIELDS: (keyof CitizenProfile)[] = [
  'district',
  'age',
  'gender',
  'occupationCategory',
  'incomeBand',
  'educationLevel',
  'category',
  'disabilityStatus',
  'maritalStatus',
  'landOwnershipAcres',
  'businessType'
];

const GENDERS = ['female', 'male', 'other'];
const CATEGORIES = ['general', 'obc', 'sc', 'st', 'ews'];
const MARITAL_STATUSES = ['single', 'married', 'widowed', 'divorced'];

/**
 * Sentence case for a stored slug: `single` → `Single`.
 *
 * Only marital status still goes through this. Gender and category are
 * read off `gender.*` / `cat.*` in the locale files instead — this screen
 * exists in eleven languages, and those two lists reach every one of them.
 */
const pretty = (value: string) =>
  value.length <= 3 ? value.toUpperCase() : value[0].toUpperCase() + value.slice(1);

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>({});
  const [saved, setSaved] = useState(false);

  // Shared with the onboarding gate, so both read one query rather than two
  // that disagree about what a 404 means.
  const { data: profile } = useCitizenProfile();

  useEffect(() => {
    if (profile) setDraft(profile);
  }, [profile]);

  const save = useMutation({
    mutationFn: async (next: Draft) => {
      const res = await apiClient.put('/profile', next);
      return res.data?.data as CitizenProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    }
  });

  const completeness = useMemo(() => {
    const filled = OPTIONAL_FIELDS.filter((f) => {
      const value = draft[f];
      return value !== undefined && value !== null && value !== '';
    }).length;
    return Math.round(((filled + (draft.state ? 1 : 0)) / (OPTIONAL_FIELDS.length + 1)) * 100);
  }, [draft]);

  const set = <K extends keyof CitizenProfile>(key: K, value: CitizenProfile[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  if (!isAuthenticated) {
    return (
      <PageBody>
        <PageHeader eyebrow={t('profile.eyebrow')} title={t('profile.title')} />
        <div className="mt-8">
          <EmptyState
            icon={UserRound}
            title={t('profile.signInTitle')}
            description={t('profile.signInDesc')}
            action={
              <Button asChild>
                <Link to="/login">{t('common.signIn')}</Link>
              </Button>
            }
          />
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-3xl">
      <PageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.formDesc')}
      />

      {/* Completeness — a nudge, never a gate */}
      <div className="mt-7 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule">
          <div
            className="h-full rounded-full bg-sanction transition-[width] duration-300"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <span className="register-strong shrink-0">{t('profile.filled', { percent: completeness })}</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(draft);
        }}
        className="mt-8 space-y-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Collected during onboarding; editable here like everything else. */}
          <Input
            label={t('onboarding.nameQuestion')}
            value={draft.fullName ?? ''}
            onChange={(e) => set('fullName', e.target.value)}
            placeholder={t('onboarding.namePlaceholder')}
          />

          <div className="space-y-1.5">
            <Label htmlFor="profile-state">{t('profile.state')}</Label>
            <Select value={draft.state ?? ''} onValueChange={(v) => set('state', v)}>
              <SelectTrigger id="profile-state" className="h-11">
                <SelectValue placeholder={t('profile.chooseState')} />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            label={t('profile.district')}
            value={draft.district ?? ''}
            onChange={(e) => set('district', e.target.value)}
            placeholder={t('profile.optional')}
          />

          <Input
            label={t('profile.age')}
            type="number"
            min={0}
            max={120}
            value={draft.age ?? ''}
            onChange={(e) => set('age', e.target.value ? Number(e.target.value) : null)}
            placeholder={t('profile.optional')}
          />

          <div className="space-y-1.5">
            <Label htmlFor="profile-occupation">{t('profile.occupation')}</Label>
            <Select
              value={draft.occupationCategory ?? ''}
              onValueChange={(v) => set('occupationCategory', v)}
            >
              <SelectTrigger id="profile-occupation" className="h-11">
                <SelectValue placeholder={t('profile.optional')} />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {t(s.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-income">{t('profile.income')}</Label>
            <Select value={draft.incomeBand ?? ''} onValueChange={(v) => set('incomeBand', v)}>
              <SelectTrigger id="profile-income" className="h-11">
                <SelectValue placeholder={t('profile.optional')} />
              </SelectTrigger>
              <SelectContent>
                {INCOME_BANDS.map((b) => (
                  <SelectItem key={b.slug} value={b.slug}>
                    {t(b.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            label={t('profile.education')}
            value={draft.educationLevel ?? ''}
            onChange={(e) => set('educationLevel', e.target.value)}
            placeholder={t('profile.optional')}
          />

          <div className="space-y-1.5">
            <Label htmlFor="profile-gender">{t('profile.gender')}</Label>
            <Select value={draft.gender ?? ''} onValueChange={(v) => set('gender', v)}>
              <SelectTrigger id="profile-gender" className="h-11">
                <SelectValue placeholder={t('profile.optional')} />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {t(`gender.${g}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/*
          Category, disability, marital status and land holding decide
          eligibility for a large part of the register, so they belong on the
          profile — but they are the most sensitive things we ask for, so they
          sit behind a disclosure with the reason stated, never open by default.
        */}
        <details className="rounded-md border border-rule-strong bg-surface px-4 py-3">
          <summary className="cursor-pointer text-[0.875rem] font-medium text-ink">
            {t('profile.sensitiveSummary')}
          </summary>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">
            {t('profile.sensitiveNote')}
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profile-category">{t('profile.category')}</Label>
              <Select value={draft.category ?? ''} onValueChange={(v) => set('category', v)}>
                <SelectTrigger id="profile-category" className="h-11">
                  <SelectValue placeholder={t('profile.optional')} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`cat.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-marital">{t('profile.maritalStatus')}</Label>
              <Select value={draft.maritalStatus ?? ''} onValueChange={(v) => set('maritalStatus', v)}>
                <SelectTrigger id="profile-marital" className="h-11">
                  <SelectValue placeholder={t('profile.optional')} />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {pretty(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-disability">{t('profile.disability')}</Label>
              <Select
                value={draft.disabilityStatus === null || draft.disabilityStatus === undefined ? '' : String(draft.disabilityStatus)}
                onValueChange={(v) => set('disabilityStatus', v === 'true')}
              >
                <SelectTrigger id="profile-disability" className="h-11">
                  <SelectValue placeholder={t('profile.optional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t('profile.disabilityYes')}</SelectItem>
                  <SelectItem value="false">{t('profile.disabilityNo')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              label={t('profile.land')}
              type="number"
              min={0}
              step="0.1"
              value={draft.landOwnershipAcres ?? ''}
              onChange={(e) =>
                set('landOwnershipAcres', e.target.value ? Number(e.target.value) : null)
              }
              placeholder={t('profile.optional')}
            />

            <Input
              label={t('profile.businessType')}
              value={draft.businessType ?? ''}
              onChange={(e) => set('businessType', e.target.value)}
              placeholder={t('profile.businessPlaceholder')}
            />
          </div>
        </details>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending || !draft.state}>
            {save.isPending ? t('profile.saving') : t('profile.saveDetails')}
          </Button>
          {saved && <span className="text-[0.875rem] text-sanction">{t('common.saved')}</span>}
          {save.isError && (
            <span className="text-[0.875rem] text-seal">
              {t('profile.saveFailed')}
            </span>
          )}
        </div>
      </form>
    </PageBody>
  );
};
