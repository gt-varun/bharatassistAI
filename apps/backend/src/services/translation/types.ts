/**
 * The translation layer, stated as an interface first.
 *
 * No provider is a safe long-term bet here: a free Gemini tier can change,
 * Bhashini needs registration that may lapse, and an offline IndicTrans2 box
 * may not exist on every machine. Everything above this file is written
 * against `TranslationProvider`, so swapping the source of translations is a
 * config change rather than a rewrite.
 */

export interface TranslationRequest {
  /** Source text, always English — the register's own working language. */
  text: string;
  /** BCP-47-ish code as used by the locale files: `hi`, `kn`, `ur`… */
  targetLang: string;
  /**
   * Where this string appears, in a sentence. Providers that accept a system
   * prompt use it to pick register — a button label is not a paragraph.
   */
  context?: string;
}

export interface TranslationResult {
  text: string;
  /** Which provider produced it, recorded so a reviewer knows what to trust. */
  provider: string;
  /**
   * False for machine output. Nothing marked false should be presented as a
   * checked translation; the locale gate and the review tooling both read it.
   */
  verified: boolean;
}

export interface TranslationProvider {
  readonly name: string;
  /** Cheap check that the provider is usable before a long batch starts. */
  isConfigured(): boolean;
  translate(request: TranslationRequest): Promise<string>;
  /**
   * Optional batch entrypoint. Providers that can take many strings in one
   * call should implement it; the runner falls back to sequential `translate`.
   */
  translateBatch?(requests: TranslationRequest[]): Promise<string[]>;
}

export class TranslationError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}
