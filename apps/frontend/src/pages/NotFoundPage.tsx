import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageBody } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageBody className="max-w-xl py-24 text-center">
      <p className="register mb-3">{t('notFound.eyebrow')}</p>
      <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.02em]">
        {t('notFound.title')}
      </h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{t('notFound.desc')}</p>
      <div className="mt-8 flex justify-center gap-2">
        <Button asChild>
          <Link to="/search">{t('notFound.searchSchemes')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/categories">{t('nav.categories')}</Link>
        </Button>
      </div>
    </PageBody>
  );
};
