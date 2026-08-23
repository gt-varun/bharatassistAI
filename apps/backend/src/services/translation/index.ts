import { logger } from '../../utils/logger.js';
import { placeholdersIntact } from './glossary.js';
import { BhashiniTranslationProvider } from './providers/bhashini.js';
import { GeminiTranslationProvider } from './providers/gemini.js';
import { GroqTranslationProvider } from './providers/groq.js';
import { IndicTransTranslationProvider } from './providers/indictrans.js';
import {
  TranslationError,
  TranslationProvider,
  TranslationRequest,
  TranslationResult
} from './types.js';

export * from './types.js';
export * from './glossary.js';

const PROVIDERS: Record<string, () => TranslationProvider> = {
  bhashini: () => new BhashiniTranslationProvider(),
  gemini: () => new GeminiTranslationProvider(),
  groq: () => new GroqTranslationProvider(),
  indictrans: () => new IndicTransTranslationProvider()
};

/**
 * Preference order when TRANSLATION_PROVIDER is not set.
 *
 * Bhashini leads because it is the government's own service and reads best on
 * administrative wording; Groq and Gemini are both easy free-tier LLM keys —
 * Groq goes first since it's this project's already-configured chat provider
 * (see geminiClient.ts); the local IndicTrans2 server is last because it
 * requires a machine to be running it, but it is the only one that never
 * expires.
 */
const FALLBACK_ORDER = ['bhashini', 'groq', 'gemini', 'indictrans'];

export function resolveProvider(preferred?: string): TranslationProvider | null {
  const requested = preferred || process.env.TRANSLATION_PROVIDER;

  if (requested) {
    const factory = PROVIDERS[requested];
    if (!factory) throw new TranslationError(`Unknown provider "${requested}"`, 'resolver');
    const provider = factory();
    return provider.isConfigured() ? provider : null;
  }

  for (const name of FALLBACK_ORDER) {
    const provider = PROVIDERS[name]();
    if (provider.isConfigured()) return provider;
  }
  return null;
}

export interface TranslateManyOptions {
  targetLang: string;
  /** Sent with each string so the provider can judge register. */
  context?: string;
  /** Strings per provider call. Free tiers dislike very large prompts. */
  batchSize?: number;
  provider?: TranslationProvider;
  /** Called after each batch — the CLI uses it to draw progress. */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Translates a list of English strings, preserving order.
 *
 * A string whose placeholders do not survive is returned as an empty result
 * rather than a broken one: a missing translation falls back to English at
 * render time, whereas `{{count}}` lost in translation is a defect on screen.
 */
export async function translateMany(
  texts: string[],
  options: TranslateManyOptions
): Promise<TranslationResult[]> {
  const provider = options.provider ?? resolveProvider();
  if (!provider) {
    throw new TranslationError(
      'No translation provider is configured. Set TRANSLATION_PROVIDER and its credentials ' +
        '(BHASHINI_USER_ID/BHASHINI_API_KEY, GEMINI_API_KEY, or INDICTRANS_URL).',
      'resolver'
    );
  }

  const batchSize = options.batchSize ?? 25;
  const results: TranslationResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize);
    const requests: TranslationRequest[] = slice.map((text) => ({
      text,
      targetLang: options.targetLang,
      context: options.context
    }));

    const translated = provider.translateBatch
      ? await provider.translateBatch(requests)
      : await Promise.all(requests.map((r) => provider.translate(r)));

    slice.forEach((source, j) => {
      const candidate = (translated[j] ?? '').trim();
      const usable = candidate.length > 0 && placeholdersIntact(source, candidate);

      if (candidate && !usable) {
        logger.warn(
          { lang: options.targetLang, source },
          'Discarded a translation that lost its placeholders'
        );
      }

      results.push({
        text: usable ? candidate : '',
        provider: provider.name,
        // Machine output is never verified. A human marks it so, in the
        // provenance file, after reading it.
        verified: false
      });
    });

    options.onProgress?.(Math.min(i + batchSize, texts.length), texts.length);
  }

  return results;
}
