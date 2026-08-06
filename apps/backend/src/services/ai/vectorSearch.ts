import { SchemeEmbeddingModel } from '../../models/SchemeEmbedding.js';
import { embed, cosineSimilarity } from './embeddingProvider.js';
import { logger } from '../../utils/logger.js';

export interface VectorHit {
  schemeId: string;
  score: number;
}

const VECTOR_INDEX = process.env.ATLAS_VECTOR_INDEX || 'scheme_vector_index';

/**
 * Atlas is the intended home for this: `$vectorSearch` does approximate
 * nearest-neighbour lookup inside the database. It is only available on
 * Atlas, though, and a local or CI MongoDB answers with SearchNotEnabled.
 *
 * Rather than let the second retrieval arm vanish outside Atlas, we detect
 * that once and fall back to scoring in the application. At register scale
 * (hundreds to low thousands of schemes) the in-process pass is a few
 * milliseconds; it is not what you would run against a million documents,
 * which is exactly why the Atlas path is tried first.
 */
let atlasVectorAvailable: boolean | null = null;

async function tryAtlasVectorSearch(
  queryVector: number[],
  limit: number
): Promise<VectorHit[] | null> {
  if (atlasVectorAvailable === false) return null;

  try {
    const results = await SchemeEmbeddingModel.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: 'embedding',
          queryVector,
          numCandidates: Math.max(100, limit * 10),
          limit
        }
      },
      { $project: { schemeId: 1, score: { $meta: 'vectorSearchScore' } } }
    ]);

    atlasVectorAvailable = true;
    return results.map((r: any) => ({ schemeId: String(r.schemeId), score: r.score }));
  } catch (err: any) {
    if (atlasVectorAvailable === null) {
      atlasVectorAvailable = false;
      logger.info(
        { reason: err?.codeName || err?.message },
        'Atlas $vectorSearch unavailable — scoring vectors in-process instead.'
      );
    }
    return null;
  }
}

async function inProcessVectorSearch(
  queryVector: number[],
  limit: number
): Promise<VectorHit[]> {
  const all = await SchemeEmbeddingModel.find({}, { schemeId: 1, embedding: 1 }).lean();

  return all
    .map((row: any) => ({
      schemeId: String(row.schemeId),
      score: cosineSimilarity(queryVector, row.embedding)
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Semantic arm of the hybrid search. Returns scheme ids ranked by vector
 * similarity, using Atlas when it is there and the in-process pass when it
 * is not.
 */
export async function semanticSearch(query: string, limit = 50): Promise<VectorHit[]> {
  const count = await SchemeEmbeddingModel.estimatedDocumentCount();
  if (count === 0) {
    logger.debug('No scheme embeddings indexed; skipping the semantic arm.');
    return [];
  }

  const queryVector = await embed(query);
  if (!queryVector.length) return [];

  const viaAtlas = await tryAtlasVectorSearch(queryVector, limit);
  if (viaAtlas) return viaAtlas;

  return inProcessVectorSearch(queryVector, limit);
}

/**
 * Reciprocal Rank Fusion.
 *
 * Keyword relevance (textScore) and vector similarity (cosine) are on
 * different, incomparable scales, so blending the raw numbers would let
 * whichever happens to be larger dominate. RRF throws the magnitudes away
 * and combines *positions* instead: a document ranked well by either arm
 * rises, and one ranked well by both rises furthest. k=60 is the constant
 * from the original paper and damps the influence of the very top ranks.
 */
export function reciprocalRankFusion(
  rankings: string[][],
  weights: number[] = [],
  k = 60
): Map<string, number> {
  const fused = new Map<string, number>();

  rankings.forEach((ranking, armIndex) => {
    const weight = weights[armIndex] ?? 1;
    ranking.forEach((id, position) => {
      const contribution = weight / (k + position + 1);
      fused.set(id, (fused.get(id) || 0) + contribution);
    });
  });

  return fused;
}
