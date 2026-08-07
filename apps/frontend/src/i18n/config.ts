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

/**
 * Sentinel keys that stand in for "this locale is usable at all".
 *
 * They are spread across namespaces on purpose, so a file that was truncated
 * or only half-translated is caught. Keep them pointing at keys that really
 * exist — if every sentinel goes missing, every language is judged
 * incomplete and the selector below has nothing to offer.
 */
const REQUIRED_KEYS = ['common.appName', 'nav.home', 'search.title', 'login.title'];

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
  const complete = ALL_LANGUAGES.filter((lang) => isLanguageComplete(lang.code));

  // A language selector that offers nothing is worse than one that offers
  // too much: whoever is already reading in Punjabi would have no way back
  // to English. If the completeness check ever disqualifies everything,
  // it is the check that is wrong, so fall back to the full list.
  if (complete.length === 0) {
    console.warn(
      '[i18n] No locale satisfied the completeness check — offering all languages. ' +
        'REQUIRED_KEYS is probably pointing at keys that no longer exist.'
    );
    return ALL_LANGUAGES;
  }

  return complete;
};

const LANGUAGE_KEY = 'bharatassist_language';

/**
 * Storage is not guaranteed: it is absent when rendering outside a browser,
 * and reading it throws outright in Safari private browsing and wherever a
 * user has blocked site data. Losing the saved language is a small thing;
 * taking the whole module down at import time is not.
 */
function readStored(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    /* A language that does not persist still applies for this session. */
  }
}

/** A chosen language has to survive a reload, or it isn't really chosen. */
function initialLanguage(): string {
  const stored = readStored(LANGUAGE_KEY);
  if (stored && ALL_LANGUAGES.some((l) => l.code === stored)) return stored;

  // Fall back to the browser's preference when it is one we actually speak.
  const browser =
    typeof navigator === 'undefined' ? undefined : navigator.language?.split('-')[0];
  return browser && ALL_LANGUAGES.some((l) => l.code === browser) ? browser : 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

/** Languages whose scripts render better in Noto than in the Latin display face. */
const NON_LATIN = new Set(['hi', 'kn', 'ta', 'te', 'ml', 'mr', 'gu', 'bn', 'pa', 'ur']);

function applyLanguage(lng: string) {
  if (typeof document === 'undefined') return;
  const meta = ALL_LANGUAGES.find((l) => l.code === lng);
  document.dir = meta?.rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  if (NON_LATIN.has(lng)) document.documentElement.dataset.script = 'indic';
  else delete document.documentElement.dataset.script;
}

i18n.on('languageChanged', (lng) => {
  writeStored(LANGUAGE_KEY, lng);
  applyLanguage(lng);
});

// The document starts in whatever language we resolved above, not in English.
applyLanguage(i18n.language || 'en');

export default i18n;
