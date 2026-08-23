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
 * Every leaf string in a resource bundle, as dotted keys.
 */
function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') return value.trim().length > 0 ? [dotted] : [];
    if (value && typeof value === 'object') return flattenKeys(value, dotted);
    return [];
  });
}

const ENGLISH_KEYS = flattenKeys(en);

/**
 * Coverage of a locale against English, 0–1.
 *
 * §2.4 asks that a language not be offered until its string coverage is
 * complete, and this is what enforces it. It compares every key rather than a
 * handful of sentinels: a file missing two hundred strings used to pass the
 * old sentinel check and then hand the citizen half an English screen.
 */
export const languageCoverage = (langCode: string): number => {
  const resource = resources[langCode as keyof typeof resources]?.translation;
  if (!resource) return 0;
  if (ENGLISH_KEYS.length === 0) return 1;

  const translated = new Set(flattenKeys(resource));
  const present = ENGLISH_KEYS.filter((key) => translated.has(key)).length;
  return present / ENGLISH_KEYS.length;
};

/**
 * Plural forms are the one accepted gap: i18next resolves `key_one`/`key_other`
 * per language, and a language with a single plural form legitimately carries
 * fewer keys than English. So completeness is 99%, not exact parity.
 */
const COMPLETE_THRESHOLD = 0.99;

export const isLanguageComplete = (langCode: string): boolean =>
  languageCoverage(langCode) >= COMPLETE_THRESHOLD;

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
