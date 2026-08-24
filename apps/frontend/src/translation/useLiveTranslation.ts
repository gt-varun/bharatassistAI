import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';

/**
 * Translating text that only exists at runtime.
 *
 * The interface is translated ahead of time in the locale files, and scheme
 * records carry stored translations produced by `pnpm translate:schemes`.
 * Neither covers a record added since the last translation run — and the
 * result is a citizen reading in Tamil who hits an English paragraph in the
 * middle of the one page they came for.
 *
 * This asks the API to translate those leftovers on demand. Three things
 * keep it honest:
 *
 *   • English is never sent anywhere — the source language needs no work.
 *   • Results are cached for the session, so a list of scheme cards costs
 *     one request rather than one per card per render.
 *   • If the server has no translation provider (a normal, supported
 *     deployment state) it answers 503 and this returns the English it was
 *     given. A missing translation must degrade to readable English, never
 *     to a blank space.
 */

/** `lang␟text` → translated. Module-level so it survives remounts. */
const cache = new Map<string, string>();

const cacheKey = (lang: string, text: string) => `${lang}␟text:${text}`;

interface Options {
  /** Where the text appears — providers use it to pick register. */
  context?: string;
  /** Skip the request entirely (e.g. while the source is still loading). */
  enabled?: boolean;
}

export function useLiveTranslation(sources: string[], { context, enabled = true }: Options = {}) {
  const { i18n } = useTranslation();
  const language = i18n.language || 'en';

  // Stable identity for the dependency list; the array itself is usually a
  // fresh literal on every render.
  const signature = useMemo(() => sources.join('␞'), [sources]);

  const resolve = (list: string[]) =>
    list.map((text) => (text ? (cache.get(cacheKey(language, text)) ?? text) : text));

  const [prevSignature, setPrevSignature] = useState(signature);
  const [translated, setTranslated] = useState<string[]>(() => resolve(sources));
  const [isTranslating, setIsTranslating] = useState(false);
  const mounted = useRef(true);

  if (prevSignature !== signature) {
    setPrevSignature(signature);
    setTranslated(resolve(sources));
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const list = signature ? signature.split('␞') : [];

    if (!enabled || language === 'en' || list.length === 0) {
      setTranslated(list);
      return;
    }

    // Show whatever is cached immediately — usually everything, after the
    // first visit to a page.
    setTranslated(resolve(list));

    const missing = [...new Set(list.filter((t) => t && !cache.has(cacheKey(language, t))))];
    if (missing.length === 0) return;

    let cancelled = false;
    setIsTranslating(true);

    apiClient
      .post('/translate', { texts: missing, targetLang: language, context })
      .then((res) => {
        const results: string[] = res.data?.data?.translations ?? [];
        missing.forEach((source, i) => {
          const value = results[i];
          if (value) cache.set(cacheKey(language, source), value);
        });
        if (!cancelled && mounted.current) setTranslated(resolve(list));
      })
      .catch(() => {
        /*
         * 503 (no provider) or a network failure. The English already on
         * screen stays — deliberately not cached, so a later visit with a
         * provider configured will try again.
         */
      })
      .finally(() => {
        if (!cancelled && mounted.current) setIsTranslating(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, language, context, enabled]);

  return { texts: translated, isTranslating };
}

/** Single-string convenience over the same cache and request batching. */
export function useLiveText(source: string, options?: Options): string {
  const list = useMemo(() => (source ? [source] : []), [source]);
  const { texts } = useLiveTranslation(list, options);
  return texts[0] ?? source;
}
