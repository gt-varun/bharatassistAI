import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { getAvailableLanguages } from '../../i18n/config.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './select.js';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const availableLanguages = getAvailableLanguages();

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-amber-500 shrink-0" />
      <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
        <SelectTrigger className="w-[180px] bg-slate-800 text-white">
          <SelectValue placeholder="Select Language" />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
