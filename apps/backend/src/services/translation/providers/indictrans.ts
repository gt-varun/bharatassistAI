import { TranslationError, TranslationProvider, TranslationRequest } from '../types.js';

/** IndicTrans2's own language tags, which are not the codes our locales use. */
const INDIC_TAGS: Record<string, string> = {
  hi: 'hin_Deva',
  kn: 'kan_Knda',
  ta: 'tam_Taml',
  te: 'tel_Telu',
  ml: 'mal_Mlym',
  mr: 'mar_Deva',
  gu: 'guj_Gujr',
  bn: 'ben_Beng',
  pa: 'pan_Guru',
  ur: 'urd_Arab'
};

/**
 * IndicTrans2 (AI4Bharat) running locally — the option that needs no key and
 * no network, and stays free permanently.
 *
 * This adapter talks to a small local HTTP server wrapping the model rather
 * than embedding Python in the Node process; `scripts/indictrans_server.py`
 * in the repo root is the reference implementation. Point
 * INDICTRANS_URL at it.
 */
export class IndicTransTranslationProvider implements TranslationProvider {
  readonly name = 'indictrans';

  private get baseUrl(): string {
    return process.env.INDICTRANS_URL || 'http://localhost:8000';
  }

  isConfigured(): boolean {
    // A URL is always present by default, so configuration here means the
    // operator explicitly chose this provider; reachability is checked on use.
    return Boolean(process.env.INDICTRANS_URL) || process.env.TRANSLATION_PROVIDER === 'indictrans';
  }

  async translate(request: TranslationRequest): Promise<string> {
    const [only] = await this.translateBatch([request]);
    return only;
  }

  async translateBatch(requests: TranslationRequest[]): Promise<string[]> {
    if (requests.length === 0) return [];

    const targetLang = requests[0].targetLang;
    const tag = INDIC_TAGS[targetLang];
    if (!tag) {
      throw new TranslationError(`IndicTrans2 has no tag for "${targetLang}"`, this.name);
    }

    try {
      const res = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_lang: 'eng_Latn',
          target_lang: tag,
          sentences: requests.map((r) => r.text)
        })
      });

      if (!res.ok) {
        throw new TranslationError(`IndicTrans2 server returned ${res.status}`, this.name);
      }

      const body = (await res.json()) as { translations?: string[] };
      return requests.map((_, i) => body.translations?.[i] ?? '');
    } catch (error) {
      if (error instanceof TranslationError) throw error;
      throw new TranslationError(
        `IndicTrans2 server unreachable at ${this.baseUrl}`,
        this.name,
        error
      );
    }
  }
}
