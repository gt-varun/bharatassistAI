import { GoogleGenAI } from '@google/genai';
import { logger } from '../../utils/logger.js';

/**
 * The single entrypoint for LLM calls in BharatAssist AI (docs/rules.md #14
 * — no route handler, component, or script calls a model provider directly).
 *
 * Chat completions run on Groq (fast Llama inference) when GROQ_API_KEY is
 * set, per the user's request to switch providers. Embeddings stay on the
 * Gemini embedding model — Groq does not expose an embeddings endpoint —
 * with the same zero-vector-triggers-local-fallback behaviour
 * `embeddingProvider.ts` already relied on. If neither key is configured,
 * every function below degrades to an explicit, clearly-labelled offline
 * response rather than throwing, so the rest of the app keeps working.
 *
 * Every env var below is read lazily (inside a function), never captured
 * into a module-level `const` at import time. That's deliberate, not style:
 * in an ES module, `import` declarations are evaluated before any of the
 * importing file's own top-level statements — including ones that appear
 * textually earlier. `server.ts` calls `dotenv.config()` before
 * `import { createApp } from './app.js'` in source order, but because both
 * lines are import declarations' worth of hoisting, `app.js` (and this file,
 * transitively) actually finish evaluating *before* `dotenv.config()` runs.
 * A module-level `const apiKey = process.env.GEMINI_API_KEY` would
 * permanently capture an empty string no matter what's in `.env`. Reading
 * `process.env` inside each function sidesteps the ordering question
 * entirely — by the time a request actually arrives, `dotenv.config()` has
 * long since run.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const EMBEDDING_MODEL = 'text-embedding-004';

function getGroqApiKey(): string {
  return process.env.GROQ_API_KEY || '';
}

function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

function getGroqChatModel(): string {
  return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
}

// The Gemini SDK client is cheap to construct and holds no connection state,
// but it's still cached per-key so a steady-state server (key never changes
// after boot) isn't reconstructing it on every single call.
let cachedGeminiClient: GoogleGenAI | null = null;
let cachedGeminiKey: string | null = null;
function getGeminiClient(): GoogleGenAI {
  const key = getGeminiApiKey();
  if (!cachedGeminiClient || cachedGeminiKey !== key) {
    cachedGeminiClient = new GoogleGenAI({ apiKey: key });
    cachedGeminiKey = key;
  }
  return cachedGeminiClient;
}

export interface ChatCompletionOptions {
  prompt: string;
  context?: string;
  systemInstruction?: string;
}

export interface ChatCompletionResponse {
  text: string;
  sourceSchemeIds?: string[];
  /** Which provider actually answered — explainability metadata for the AI Gateway (services/ai/aiGateway.ts). */
  provider: 'groq' | 'gemini' | 'offline';
  model: string;
}

function hasGroqKey(): boolean {
  const key = getGroqApiKey();
  return Boolean(key && key !== 'your_groq_api_key');
}

function hasGeminiKey(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key !== 'your_gemini_api_key');
}

function buildUserContent(prompt: string, context?: string): string {
  return context ? `Retrieved Grounding Context:\n${context}\n\nUser Question:\n${prompt}` : prompt;
}

async function chatViaGroq(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
  const { prompt, context, systemInstruction } = options;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: buildUserContent(prompt, context) });

  const model = getGroqChatModel();
  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getGroqApiKey()}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq chat completion failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as any;
  const text: string = json?.choices?.[0]?.message?.content ?? '';
  return { text, sourceSchemeIds: [], provider: 'groq', model };
}

async function chatViaGemini(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
  const { prompt, context, systemInstruction } = options;

  const response = await getGeminiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: buildUserContent(prompt, context),
    config: {
      systemInstruction: systemInstruction || 'You are BharatAssist AI, a helpful Indian government scheme discovery assistant.'
    }
  });

  return { text: response.text || '', sourceSchemeIds: [], provider: 'gemini', model: 'gemini-2.5-flash' };
}

/**
 * Single entrypoint for chat/completion calls. Tries Groq first (if
 * configured), falls back to Gemini, and finally to a clearly-labelled
 * offline response — never throws for a missing key, only for a genuine
 * failure with no fallback left to try.
 */
export const generateChatCompletion = async (
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> => {
  if (hasGroqKey()) {
    try {
      return await chatViaGroq(options);
    } catch (error) {
      logger.error({ error }, 'Groq chat completion error');
      if (hasGeminiKey()) {
        try {
          return await chatViaGemini(options);
        } catch (fallbackError) {
          logger.error({ fallbackError }, 'Gemini fallback also failed after Groq error');
        }
      }
    }
  } else if (hasGeminiKey()) {
    try {
      return await chatViaGemini(options);
    } catch (error) {
      logger.error({ error }, 'Gemini chat completion error');
      throw error;
    }
  }

  logger.warn('No AI chat provider configured (GROQ_API_KEY / GEMINI_API_KEY missing). Using fallback response mode.');
  return {
    text: `[AI Fallback Response]: Context provided: ${options.context ? 'Yes' : 'No'}. Query processed: "${options.prompt}".`,
    sourceSchemeIds: [],
    provider: 'offline',
    model: 'none'
  };
};

/**
 * Single entrypoint for generating embeddings, using text-embedding-004.
 * Unaffected by the Groq switch — Groq has no embeddings endpoint, so the
 * semantic search arm (services/ai/embeddingProvider.ts) still reads this,
 * with its own local-encoder fallback when this returns a zero vector.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!hasGeminiKey()) {
    logger.warn('GEMINI_API_KEY missing or placeholder. Returning dummy zero embedding.');
    return new Array(768).fill(0);
  }

  try {
    const res = (await getGeminiClient().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text
    })) as any;

    return res.embedding?.values || res.embeddings?.[0]?.values || [];
  } catch (error) {
    logger.error({ error }, 'Gemini embedding generation error');
    throw error;
  }
};

export interface AIHealthStatus {
  provider: 'groq' | 'gemini' | 'none';
  reachable: boolean;
}

/** Health check utility — pings whichever chat provider is actually configured. */
export const checkAIHealth = async (): Promise<AIHealthStatus> => {
  if (hasGroqKey()) {
    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getGroqApiKey()}` },
        body: JSON.stringify({
          model: getGroqChatModel(),
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });
      return { provider: 'groq', reachable: res.ok };
    } catch (error) {
      logger.error({ error }, 'Groq health check failed');
      return { provider: 'groq', reachable: false };
    }
  }

  if (hasGeminiKey()) {
    try {
      await getGeminiClient().models.embedContent({ model: EMBEDDING_MODEL, contents: 'healthcheck' });
      return { provider: 'gemini', reachable: true };
    } catch (error) {
      logger.error({ error }, 'Gemini API health check failed');
      return { provider: 'gemini', reachable: false };
    }
  }

  return { provider: 'none', reachable: false };
};

/** @deprecated use checkAIHealth — kept so any straggling import still works. */
export const checkGeminiHealth = async (): Promise<boolean> => (await checkAIHealth()).reachable;
