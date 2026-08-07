import { describe, it, expect } from 'vitest';
import {
  ALL_LANGUAGES,
  getAvailableLanguages,
  isLanguageComplete,
  languageCoverage
} from './config';
import en from './locales/en.json';

/**
 * The language selector renders whatever `getAvailableLanguages()` returns.
 * When that list came back empty, the control silently fell back to a
 * hardcoded "English" label with an empty dropdown — leaving anyone already
 * reading in another language with no way back. These tests pin the two
 * things that have to hold for the selector to stay usable, and the parity
 * that keeps a chosen language from decaying into half an English screen.
 */

function flatten(obj: Record<string, any>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') return value.trim().length > 0 ? [dotted] : [];
    if (value && typeof value === 'object') return flatten(value, dotted);
    return [];
  });
}

const ENGLISH_KEYS = flatten(en);

/**
 * Locales still awaiting a translation run — `pnpm translate` fills these once
 * a provider is configured (see docs/translation.md). They stay listed here
 * rather than being quietly excused: the selector hides them, and removing a
 * code from this list is what puts a language under the parity guard below.
 */
const PENDING_TRANSLATION = ['gu', 'bn', 'pa', 'ur'];

describe('locale coverage', () => {
  it('has a non-trivial English source to measure against', () => {
    expect(ENGLISH_KEYS.length).toBeGreaterThan(400);
  });

  /**
   * The guard that matters: add a key to en.json without translating it and
   * this fails, rather than the gap reaching a citizen's screen as English.
   * `pnpm translate` closes it.
   */
  it('translates every English key in every offered language', () => {
    const gaps: string[] = [];

    for (const lang of ALL_LANGUAGES) {
      if (lang.code === 'en' || PENDING_TRANSLATION.includes(lang.code)) continue;
      const coverage = languageCoverage(lang.code);
      if (coverage < 0.99) {
        const missing = Math.round((1 - coverage) * ENGLISH_KEYS.length);
        gaps.push(`${lang.code}: ${missing} strings missing (run "pnpm translate")`);
      }
    }

    expect(gaps, `incomplete locales:\n  ${gaps.join('\n  ')}`).toEqual([]);
  });

  it('judges every offered language complete', () => {
    for (const lang of ALL_LANGUAGES) {
      if (PENDING_TRANSLATION.includes(lang.code)) continue;
      expect(isLanguageComplete(lang.code), `${lang.code} judged incomplete`).toBe(true);
    }
  });

  /**
   * §2.4: a partially translated language must never be selectable. This is
   * the assertion that keeps a half-English screen from reaching a citizen.
   */
  it('judges an untranslated language incomplete', () => {
    for (const code of PENDING_TRANSLATION) {
      expect(isLanguageComplete(code), `${code} should not yet be offered`).toBe(false);
    }
  });

  it('scores an unknown language at zero rather than throwing', () => {
    expect(languageCoverage('xx')).toBe(0);
    expect(isLanguageComplete('xx')).toBe(false);
  });
});

describe('getAvailableLanguages', () => {
  it('offers every complete language and no incomplete one', () => {
    const offered = getAvailableLanguages().map((l) => l.code);
    expect(offered).toHaveLength(ALL_LANGUAGES.length - PENDING_TRANSLATION.length);
    for (const code of PENDING_TRANSLATION) {
      expect(offered, `${code} is only part-translated and must stay hidden`).not.toContain(code);
    }
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
