import { GoogleGenAI } from '@google/genai';
import { CHAT_MODEL } from '../../ai/geminiClient.js';
import { glossaryInstruction } from '../glossary.js';
import { TranslationError, TranslationProvider, TranslationRequest } from '../types.js';

/**
 * Gemini via the free Google AI Studio tier — the provider that needs no
 * infrastructure, only a key in GEMINI_API_KEY.
 *
 * Batches are sent as a numbered list in one prompt: a hundred separate calls
 * would exhaust a free-tier rate limit long before the locale file was full.
 */
export class GeminiTranslationProvider implements TranslationProvider {
  readonly name = 'gemini';

  private get apiKey(): string {
    return process.env.GEMINI_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey) && this.apiKey !== 'your_gemini_api_key';
  }

  private client(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: this.apiKey });
  }

  async translate(request: TranslationRequest): Promise<string> {
    const [only] = await this.translateBatch([request]);
    return only;
  }

  async translateBatch(requests: TranslationRequest[]): Promise<string[]> {
    if (requests.length === 0) return [];
    if (!this.isConfigured()) {
      throw new TranslationError('GEMINI_API_KEY is not set', this.name);
    }

    const targetLang = requests[0].targetLang;
    const numbered = requests
      .map((r, i) => `${i + 1}. ${r.context ? `[${r.context}] ` : ''}${r.text}`)
      .join('\n');

    const prompt = [
      glossaryInstruction(targetLang),
      '',
      `Translate each numbered line into ${targetLang}.`,
      'Reply with the same numbering, one translation per line, nothing else.',
      '',
      numbered
    ].join('\n');

    try {
      const response = await this.client().models.generateContent({
        model: CHAT_MODEL,
        contents: prompt,
        config: { temperature: 0.2 }
      });
      return parseNumbered(response.text || '', requests.length);
    } catch (error) {
      throw new TranslationError('Gemini translation failed', this.name, error);
    }
  }
}

/**
 * Pulls `1. text` lines back apart. Models occasionally wrap the reply in a
 * code fence or add a preamble, so anything that is not a numbered line is
 * discarded rather than trusted.
 */
export function parseNumbered(reply: string, expected: number): string[] {
  const out: string[] = new Array(expected).fill('');
  for (const line of reply.split('\n')) {
    const match = line.match(/^\s*(\d+)[.)]\s*(.+?)\s*$/);
    if (!match) continue;
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < expected) out[index] = match[2].trim();
  }
  return out;
}
