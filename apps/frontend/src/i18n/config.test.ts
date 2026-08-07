import { describe, it, expect } from 'vitest';
import {
  ALL_LANGUAGES,
  getAvailableLanguages,
  isLanguageComplete
} from './config';
import en from './locales/en.json';

/**
 * The language selector renders whatever `getAvailableLanguages()` returns.
 * When that list came back empty, the control silently fell back to a
 * hardcoded "English" label with an empty dropdown — leaving anyone already
 * reading in another language with no way back. These tests pin the two
 * things that have to hold for the selector to stay usable.
 */

const REQUIRED_KEYS = ['common.appName', 'nav.home', 'search.title', 'login.title'];

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<any>((node, part) => node?.[part], tree);
}

describe('locale completeness sentinels', () => {
  it('point at keys that actually exist in en.json', () => {
    for (const key of REQUIRED_KEYS) {
      const value = lookup(en, key);
      expect(typeof value, `sentinel "${key}" is missing from en.json`).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
    }
  });

  it('judges every shipped language complete', () => {
    for (const lang of ALL_LANGUAGES) {
      expect(isLanguageComplete(lang.code), `${lang.code} judged incomplete`).toBe(true);
    }
  });
});

describe('getAvailableLanguages', () => {
  it('offers every language we ship', () => {
    expect(getAvailableLanguages()).toHaveLength(ALL_LANGUAGES.length);
  });

  it('never returns an empty list, so the selector cannot trap a reader', () => {
    expect(getAvailableLanguages().length).toBeGreaterThan(0);
  });

  it('always includes English as a way back', () => {
    expect(getAvailableLanguages().some((l) => l.code === 'en')).toBe(true);
  });

  it('gives every option a native name to render', () => {
    for (const lang of getAvailableLanguages()) {
      expect(lang.nativeName?.trim()).toBeTruthy();
    }
  });
});
