import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callAI, buildCacheKey, clearAICache, getAICacheStats } from './aiGateway.js';

const mockGenerateChatCompletion = vi.fn();

vi.mock('./geminiClient.js', () => ({
  generateChatCompletion: (...args: unknown[]) => mockGenerateChatCompletion(...args)
}));

beforeEach(() => {
  mockGenerateChatCompletion.mockReset();
  clearAICache();
});

describe('buildCacheKey', () => {
  it('is deterministic for the same inputs', () => {
    expect(buildCacheKey(['a', 'b'])).toBe(buildCacheKey(['a', 'b']));
  });

  it('differs when an input differs', () => {
    expect(buildCacheKey(['a', 'b'])).not.toBe(buildCacheKey(['a', 'c']));
  });

  it('drops undefined/null parts rather than baking them into the key', () => {
    expect(buildCacheKey(['a', undefined, 'b', null])).toBe(buildCacheKey(['a', 'b']));
  });
});

describe('callAI', () => {
  it('calls through to generateChatCompletion and attaches gateway metadata', async () => {
    mockGenerateChatCompletion.mockResolvedValue({
      text: 'hello',
      sourceSchemeIds: ['s1'],
      provider: 'groq',
      model: 'llama-3.3-70b-versatile'
    });

    const result = await callAI({ caller: 'test', promptVersion: 'v1', prompt: 'hi' });

    expect(result.text).toBe('hello');
    expect(result.provider).toBe('groq');
    expect(result.promptVersion).toBe('v1');
    expect(result.cacheHit).toBe(false);
    expect(typeof result.latencyMs).toBe('number');
    expect(mockGenerateChatCompletion).toHaveBeenCalledTimes(1);
  });

  it('serves a repeated call with the same cacheKey from cache instead of calling the model again', async () => {
    mockGenerateChatCompletion.mockResolvedValue({
      text: 'cached answer',
      sourceSchemeIds: [],
      provider: 'gemini',
      model: 'gemini-2.5-flash'
    });

    const key = buildCacheKey(['same', 'question']);
    const first = await callAI({ caller: 'test', promptVersion: 'v1', prompt: 'q', cacheKey: key });
    const second = await callAI({ caller: 'test', promptVersion: 'v1', prompt: 'q', cacheKey: key });

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.text).toBe('cached answer');
    expect(mockGenerateChatCompletion).toHaveBeenCalledTimes(1);
  });

  it('never caches the offline fallback response', async () => {
    mockGenerateChatCompletion.mockResolvedValue({
      text: '[AI Fallback Response]',
      sourceSchemeIds: [],
      provider: 'offline',
      model: 'none'
    });

    const key = buildCacheKey(['offline', 'test']);
    await callAI({ caller: 'test', promptVersion: 'v1', prompt: 'q', cacheKey: key });
    await callAI({ caller: 'test', promptVersion: 'v1', prompt: 'q', cacheKey: key });

    expect(mockGenerateChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('does not share a cached response across two different cache keys', async () => {
    mockGenerateChatCompletion
      .mockResolvedValueOnce({ text: 'answer A', sourceSchemeIds: [], provider: 'groq', model: 'x' })
      .mockResolvedValueOnce({ text: 'answer B', sourceSchemeIds: [], provider: 'groq', model: 'x' });

    const a = await callAI({ caller: 'test', promptVersion: 'v1', prompt: 'q1', cacheKey: buildCacheKey(['q1']) });
    const b = await callAI({ caller: 'test', promptVersion: 'v1', prompt: 'q2', cacheKey: buildCacheKey(['q2']) });

    expect(a.text).toBe('answer A');
    expect(b.text).toBe('answer B');
  });
});

describe('getAICacheStats', () => {
  it('reflects the number of cached entries', async () => {
    mockGenerateChatCompletion.mockResolvedValue({ text: 'x', sourceSchemeIds: [], provider: 'groq', model: 'x' });
    expect(getAICacheStats().size).toBe(0);
    await callAI({ caller: 'test', promptVersion: 'v1', prompt: 'q', cacheKey: buildCacheKey(['q']) });
    expect(getAICacheStats().size).toBe(1);
  });
});
