import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { getAvailableLanguages } from '../../i18n/config';
import { cn } from '../../lib/utils';

interface LanguageSelectorProps {
  /** `compact` fits the sidebar rail; `full` is for settings and the landing page. */
  variant?: 'compact' | 'full';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className
}) => {
  const { t, i18n } = useTranslation();
  const languages = getAvailableLanguages();
  const current = languages.find((l) => l.code === i18n.language) ?? languages[0];

  return (
    <Select value={i18n.language || 'en'} onValueChange={(code) => i18n.changeLanguage(code)}>
      <SelectTrigger
        aria-label={t("nav.changeLanguage")}
        className={cn(variant === 'compact' && 'h-9 text-[0.8125rem]', className)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Languages className="h-4 w-4 shrink-0 text-ink-3" />
          {/*
            On a 320px screen a header cannot hold a brand mark, a language
            name and a call to action at once, so the compact selector shows
            its icon alone there. The trigger keeps its `aria-label`, so the
            control is still "Change language" to a screen reader; only the
            redundant visible name goes. `full` (Settings) always shows it.
          */}
          <SelectValue>
            <span className={cn('truncate', variant === 'compact' && 'hidden xs:inline')}>
              {current?.nativeName ?? 'English'}
            </span>
          </SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-baseline gap-2">
              <span>{lang.nativeName}</span>
              {lang.nativeName !== lang.name && (
                <span className="font-mono text-micro text-ink-3">{lang.name}</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
