import { glossaryInstruction } from '../glossary.js';
import { TranslationError, TranslationProvider, TranslationRequest } from '../types.js';
import { parseNumbered } from './gemini.js';
import { logger } from '../../../utils/logger.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Groq's free tier gates on tokens-per-minute, not requests-per-minute — a
 * bulk translation job (dozens of batches, each carrying the full glossary
 * instruction) exhausts that budget in well under a minute even though no
 * individual call is large. The 429 body names exactly how long to wait
 * (`"Please try again in 4.755s"`), so that's parsed and honoured rather
 * than guessing a backoff.
 */
function parseRetryAfterSeconds(body: string): number {
  const match = body.match(/try again in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1])) : 5;
}

/**
 * Groq via its OpenAI-compatible chat endpoint — added so this project's
 * chosen chat provider (see geminiClient.ts) can also drive bulk
 * translation without requiring a second, unrelated API key. Same
 * numbered-batch prompt shape as GeminiTranslationProvider, since both are
 * "one LLM call, many strings" providers.
 */
export class GroqTranslationProvider implements TranslationProvider {
  readonly name = 'groq';

  private get apiKey(): string {
    return process.env.GROQ_API_KEY || '';
  }

  private get model(): string {
    return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey) && this.apiKey !== 'your_groq_api_key';
  }

  async translate(request: TranslationRequest): Promise<string> {
    const [only] = await this.translateBatch([request]);
    return only;
  }

  async translateBatch(requests: TranslationRequest[]): Promise<string[]> {
    if (requests.length === 0) return [];
    if (!this.isConfigured()) {
      throw new TranslationError('GROQ_API_KEY is not set', this.name);
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

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const res = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
          })
        });

        if (res.status === 429 && attempt < MAX_RETRIES) {
          const body = await res.text().catch(() => '');
          const waitSeconds = parseRetryAfterSeconds(body);
          logger.warn(
            { targetLang, attempt: attempt + 1, waitSeconds },
            'Groq translation hit the tokens-per-minute limit — waiting it out'
          );
          await sleep(waitSeconds * 1000);
          continue;
        }

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Groq translation failed (${res.status}): ${body}`);
        }

        const json = (await res.json()) as any;
        const text: string = json?.choices?.[0]?.message?.content ?? '';
        return parseNumbered(text, requests.length);
      } catch (error) {
        if (attempt >= MAX_RETRIES) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error({ message, targetLang, requestCount: requests.length }, 'Groq translation batch failed');
          throw new TranslationError('Groq translation failed', this.name, error);
        }
        // A network blip mid-batch is worth one retry too, not just 429s.
        await sleep(1000);
      }
    }

    // Unreachable — the loop above always returns or throws — but keeps the
    // function's return type honest without a non-null assertion.
    throw new TranslationError('Groq translation failed after retries', this.name);
  }
}
