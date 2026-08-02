import { GoogleGenAI } from '@google/genai';
import { logger } from '../../utils/logger.js';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const EMBEDDING_MODEL = 'text-embedding-004';
export const CHAT_MODEL = 'gemini-2.5-flash';

export interface ChatCompletionOptions {
  prompt: string;
  context?: string;
  systemInstruction?: string;
}

export interface ChatCompletionResponse {
  text: string;
  sourceSchemeIds?: string[];
}

/**
 * Single entrypoint for LLM completions in BharatAssist AI.
 */
export const generateChatCompletion = async (
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> => {
  const { prompt, context, systemInstruction } = options;

  if (!apiKey || apiKey === 'your_gemini_api_key') {
    logger.warn('GEMINI_API_KEY missing or placeholder. Using fallback response mode.');
    return {
      text: `[AI Fallback Response]: Context provided: ${context ? 'Yes' : 'No'}. Query processed: "${prompt}".`,
      sourceSchemeIds: []
    };
  }

  try {
    const fullPrompt = context
      ? `Retrieved Grounding Context:\n${context}\n\nUser Question:\n${prompt}`
      : prompt;

    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction || 'You are BharatAssist AI, a helpful Indian government scheme discovery assistant.'
      }
    });

    return {
      text: response.text || '',
      sourceSchemeIds: []
    };
  } catch (error) {
    logger.error({ error }, 'Gemini chat completion error');
    throw error;
  }
};

/**
 * Single entrypoint for generating embeddings using text-embedding-004.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    logger.warn('GEMINI_API_KEY missing or placeholder. Returning dummy zero embedding.');
    return new Array(768).fill(0);
  }

  try {
    const res = (await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text
    })) as any;

    return res.embedding?.values || res.embeddings?.[0]?.values || [];
  } catch (error) {
    logger.error({ error }, 'Gemini embedding generation error');
    throw error;
  }
};

/**
 * Health check utility to test Gemini API key connectivity
 */
export const checkGeminiHealth = async (): Promise<boolean> => {
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return false;
  }
  try {
    await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: 'healthcheck'
    });
    return true;
  } catch (error) {
    logger.error({ error }, 'Gemini API health check failed');
    return false;
  }
};
