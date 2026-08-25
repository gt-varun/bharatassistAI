import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, ArrowLeft } from 'lucide-react';
import { PageBody } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';

export const AiOnboardingPlaceholder: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from;

  return (
    <PageBody className="max-w-2xl flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="mb-6 rounded-full bg-sanction/10 p-6 text-sanction">
        <Bot className="h-12 w-12" />
      </div>
      <h1 className="font-display text-[1.5rem] font-bold text-ink mb-3">
        {t('onboarding.aiTitle')}
      </h1>
      <p className="text-ink-2 max-w-md mx-auto mb-8 text-[0.9375rem] leading-relaxed">
        {t('onboarding.aiPlaceholder')}
      </p>
      
      <Button asChild variant="outline">
        <Link to="/welcome" state={{ from: destination }}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Link>
      </Button>
    </PageBody>
  );
};
