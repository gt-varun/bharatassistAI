import { generateEmbedding as geminiEmbedding } from './geminiClient.js';
import { logger } from '../../utils/logger.js';

/**
 * One place that turns text into a vector.
 *
 * With GEMINI_API_KEY set we use text-embedding-004, which gives true
 * semantic retrieval — "help buying a pump set" finds an irrigation subsidy
 * that shares no keyword with the query.
 *
 * Without a key we fall back to a deterministic local encoder rather than
 * disabling the second retrieval arm. Be clear about what that fallback is:
 * it is *lexical*, not semantic. It hashes character trigrams, so it buys
 * typo tolerance and morphological slack ("scholarships" ≈ "scholarship",
 * "vidyasiri" ≈ "vidyashiri") which the exact-token `$text` index does not
 * have, but it does not understand meaning. Search stays useful offline and
 * in CI; it gets materially better the moment a key is present.
 */

export const LOCAL_DIMS = 256;
const GEMINI_DIMS = 768;

/** True when we are producing real semantic vectors. */
export function isSemanticProvider(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key !== 'your_gemini_api_key');
}

export function embeddingDimensions(): number {
  return isSemanticProvider() ? GEMINI_DIMS : LOCAL_DIMS;
}

/** FNV-1a, so the same trigram always lands in the same bucket. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Character-trigram bag-of-features, L2 normalised so that dot product is
 * cosine similarity. Word boundaries are padded so short words still emit
 * trigrams and prefixes carry weight.
 */
export function localEmbedding(text: string): number[] {
  const vec = new Array(LOCAL_DIMS).fill(0);
  const words = normalise(text).split(' ').filter(Boolean);

  for (const word of words) {
    const padded = `  ${word} `;
    for (let i = 0; i < padded.length - 2; i++) {
      const gram = padded.slice(i, i + 3);
      vec[hash(gram) % LOCAL_DIMS] += 1;
    }
    // The whole token too, so exact matches outweigh incidental trigram overlap.
    vec[hash(`|${word}|`) % LOCAL_DIMS] += 2;
  }

  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

/** Embed text with whichever provider is configured. */
export async function embed(text: string): Promise<number[]> {
  if (!isSemanticProvider()) return localEmbedding(text);

  try {
    const vector = await geminiEmbedding(text);
    // A zero vector is what geminiClient returns when it cannot embed; it
    // would poison cosine similarity, so treat it as a failure.
    if (!vector.length || vector.every((v) => v === 0)) {
      logger.warn('Embedding provider returned an empty vector; using local encoder.');
      return localEmbedding(text);
    }
    return vector;
  } catch (err) {
    logger.error({ err }, 'Embedding failed; falling back to the local encoder.');
    return localEmbedding(text);
  }
}

/** Cosine similarity for two same-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * The text we index for a scheme. Kept in one place so the backfill script
 * and any re-embedding path can never drift apart.
 */
export function schemeIndexText(scheme: {
  name: string;
  department?: string;
  shortDescription?: string;
  fullDescription?: string;
  benefitSummary?: string;
  eligibilitySummaryPlain?: string;
  targetSegments?: string[];
  state?: string | null;
}): string {
  return [
    scheme.name,
    scheme.department,
    scheme.shortDescription,
    scheme.fullDescription,
    scheme.benefitSummary,
    scheme.eligibilitySummaryPlain,
    scheme.targetSegments?.join(' '),
    scheme.state
  ]
    .filter(Boolean)
    .join('. ');
}
