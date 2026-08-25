import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, FileText, ArrowRight } from 'lucide-react';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { useCitizenProfile } from '../hooks/useCitizenProfile';
import { markOnboardingSkipped } from './useOnboarding';

export const OnboardingChoicePage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useCitizenProfile();

  // If they somehow land here but already have a profile, bounce them to the dashboard.
  if (!isLoading && profile) {
    return <Navigate to="/dashboard" replace />;
  }

  const destination = (location.state as { from?: string } | null)?.from;

  const handleSkip = () => {
    markOnboardingSkipped();
    navigate(destination || '/dashboard');
  };

  return (
    <PageBody className="max-w-3xl">
      <PageHeader
        title={t('onboarding.choiceTitle')}
        description={t('onboarding.choiceDesc')}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* AI Path (Person 3) */}
        <Link
          to="/welcome/ai"
          state={{ from: destination }}
          className="group flex flex-col items-start rounded-xl border border-rule bg-surface p-6 transition-all duration-200 hover:border-sanction-edge hover:shadow-card hover:-translate-y-px"
        >
          <div className="mb-4 rounded-lg bg-sanction/10 p-3 text-sanction">
            <Bot className="h-6 w-6" />
          </div>
          <h3 className="font-display text-[1.125rem] font-semibold text-ink group-hover:text-sanction transition-colors">
            {t('onboarding.aiTitle')}
          </h3>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">
            {t('onboarding.aiDesc')}
          </p>
          <div className="mt-6 flex items-center gap-2 text-[0.875rem] font-medium text-sanction">
            {t('onboarding.aiSelect')}
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* Manual Path (Person 4) */}
        <Link
          to="/welcome/manual"
          state={{ from: destination }}
          className="group flex flex-col items-start rounded-xl border border-rule bg-surface p-6 transition-all duration-200 hover:border-sanction-edge hover:shadow-card hover:-translate-y-px"
        >
          <div className="mb-4 rounded-lg bg-rule p-3 text-ink-2 group-hover:text-sanction group-hover:bg-sanction/10 transition-colors">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-display text-[1.125rem] font-semibold text-ink group-hover:text-sanction transition-colors">
            {t('onboarding.manualTitle')}
          </h3>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-2">
            {t('onboarding.manualDesc')}
          </p>
          <div className="mt-6 flex items-center gap-2 text-[0.875rem] font-medium text-ink-2 group-hover:text-sanction transition-colors">
            {t('onboarding.manualSelect')}
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-[0.875rem] text-ink-3 hover:text-ink hover:bg-rule-soft"
          onClick={handleSkip}
        >
          {t('onboarding.skipAll')}
        </Button>
      </div>
    </PageBody>
  );
};
