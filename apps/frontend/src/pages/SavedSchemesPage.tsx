import { useTranslation } from 'react-i18next';
import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { SchemeRecord } from '../components/scheme/SchemeRecord';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useSavedSchemes } from '../hooks/useSavedSchemes';
import { useSchemeRecords } from '../hooks/useSchemeRecords';
import { useAuth } from '../auth/AuthContext';

export const SavedSchemesPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { slugs, isSaved, toggle, clear } = useSavedSchemes();
  const { schemes, isLoading } = useSchemeRecords(slugs);

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

      <div className="mt-8">
        {isLoading && slugs.length > 0 && <LoadingState message="Loading your saved schemes" rows={2} />}

        {slugs.length === 0 && (
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

        {!isLoading && schemes.length > 0 && (
          <ul className="space-y-3">
            {schemes.map((scheme) => (
              <li key={scheme.slug}>
                <SchemeRecord
                  scheme={scheme}
                  saved={isSaved(scheme.slug)}
                  onToggleSave={(s) => toggle(s.slug)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageBody>
  );
};
