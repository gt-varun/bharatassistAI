import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import bn from './locales/bn.json';
import pa from './locales/pa.json';
import ur from './locales/ur.json';

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

export const ALL_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true }
];

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  kn: { translation: kn },
  ta: { translation: ta },
  te: { translation: te },
  ml: { translation: ml },
  mr: { translation: mr },
  gu: { translation: gu },
  bn: { translation: bn },
  pa: { translation: pa },
  ur: { translation: ur }
};

const REQUIRED_KEYS = ['common.appName', 'common.search', 'common.login', 'common.checkEligibility'];

export const isLanguageComplete = (langCode: string): boolean => {
  const resource = resources[langCode as keyof typeof resources]?.translation;
  if (!resource) return false;
  return REQUIRED_KEYS.every((key) => {
    const parts = key.split('.');
    let curr: any = resource;
    for (const part of parts) {
      curr = curr?.[part];
    }
    return typeof curr === 'string' && curr.trim().length > 0;
  });
};

export const getAvailableLanguages = (): LanguageMeta[] => {
  return ALL_LANGUAGES.filter((lang) => isLanguageComplete(lang.code));
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

i18n.on('languageChanged', (lng) => {
  const isRtl = ALL_LANGUAGES.find((l) => l.code === lng)?.rtl;
  document.dir = isRtl ? 'rtl' : 'ltr';
});

export default i18n;
