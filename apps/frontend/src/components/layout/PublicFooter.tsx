import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * The footer carries the product's honest limits (PRD §6): this is a
 * register and a guide, not a submission portal.
 */
export const PublicFooter: React.FC = () => {
  const { t } = useTranslation();

  const sections = [
    { href: '#who', label: t('landing.navWho') },
    { href: '#benefits', label: t('landing.navBenefits') },
    { href: '#how', label: t('landing.navHow') },
    { href: '#languages', label: t('landing.navLanguages') },
    { href: '#questions', label: t('landing.navQuestions') }
  ];

  return (
    <footer className="hair-top bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-sanction font-display text-sm font-bold text-white">
                BA
              </span>
              <span className="font-display text-[0.9375rem] font-semibold text-ink">
                {t('common.appName')}
              </span>
            </div>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-2">{t('footer.blurb')}</p>
          </div>

          <div>
            <h2 className="register mb-3">{t('footer.onThisPage')}</h2>
            <ul className="space-y-2 text-[0.875rem]">
              {sections.map((section) => (
                <li key={section.href}>
                  <a href={section.href} className="text-ink-2 hover:text-sanction">
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="register mb-3">{t('footer.yourAccount')}</h2>
            <ul className="space-y-2 text-[0.875rem]">
              <li>
                <Link to="/login" className="text-ink-2 hover:text-sanction">
                  {t('common.signIn')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-ink-2 hover:text-sanction">
                  {t('common.openRegister')}
                </Link>
              </li>
            </ul>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-3">{t('footer.freeNote')}</p>
          </div>

          <div>
            <h2 className="register mb-3">{t('footer.whatThisIsNot')}</h2>
            <p className="text-[0.875rem] leading-relaxed text-ink-2">{t('footer.notPortal')}</p>
          </div>
        </div>

        <div className="hair-top mt-10 flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="register">{t('footer.sourceNote')}</p>
          <p className="register">
            © {new Date().getFullYear()} {t('common.appName')}
          </p>
        </div>
      </div>
    </footer>
  );
};
