import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './select';
import { getAvailableLanguages } from '../../i18n/config';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const availableLanguages = getAvailableLanguages();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="w-4 h-4 text-amber-400 shrink-0" />
      <Select value={i18n.language || 'en'} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[140px] bg-slate-900/90 border-slate-800 text-xs font-semibold text-slate-200 focus:ring-amber-500/50">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-[300px]">
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="text-xs focus:bg-slate-800 cursor-pointer">
              <span className="font-bold text-amber-400 mr-1.5">{lang.nativeName}</span>
              <span className="text-slate-400 text-[10px]">({lang.name})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
