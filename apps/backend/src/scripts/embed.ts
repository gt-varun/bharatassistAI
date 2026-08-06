import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/db.js';
import { SchemeModel } from '../models/Scheme.js';
import { SchemeEmbeddingModel } from '../models/SchemeEmbedding.js';
import {
  embed,
  schemeIndexText,
  isSemanticProvider,
  embeddingDimensions
} from '../services/ai/embeddingProvider.js';
import { logger } from '../utils/logger.js';

/**
 * Builds the semantic index over the scheme register.
 *
 * Run after seeding, and again whenever scheme text changes:
 *   pnpm --filter @bharatassist/backend embed
 *
 * Vectors from different providers are not comparable, so switching provider
 * (adding or removing GEMINI_API_KEY) requires a full rebuild. We detect the
 * dimension mismatch and rebuild automatically rather than leaving a mixed
 * index that silently returns nonsense.
 */
export const buildEmbeddings = async () => {
  const semantic = isSemanticProvider();
  const dims = embeddingDimensions();

  logger.info(
    { provider: semantic ? 'gemini:text-embedding-004' : 'local:char-trigram', dims },
    'Building scheme embeddings'
  );

  if (!semantic) {
    logger.warn(
      'GEMINI_API_KEY is not set — indexing with the local lexical encoder. ' +
        'This gives typo tolerance but not true semantic matching. Set the key and re-run for that.'
    );
  }

  const schemes = await SchemeModel.find({}).lean();
  if (!schemes.length) {
    logger.warn('No schemes found. Run the seed first.');
    return { indexed: 0, skipped: 0 };
  }

  // Any vector of the wrong width is from another provider — drop the lot.
  const existing = await SchemeEmbeddingModel.findOne().lean();
  if (existing && Array.isArray(existing.embedding) && existing.embedding.length !== dims) {
    logger.info(
      { was: existing.embedding.length, now: dims },
      'Embedding dimensions changed; rebuilding the whole index.'
    );
    await SchemeEmbeddingModel.deleteMany({});
  }

  let indexed = 0;
  let skipped = 0;

  for (const scheme of schemes) {
    const textChunk = schemeIndexText(scheme as any);

    try {
      const embedding = await embed(textChunk);
      if (!embedding.length || embedding.every((v) => v === 0)) {
        skipped += 1;
        logger.warn({ slug: scheme.slug }, 'Empty embedding; skipped.');
        continue;
      }

      await SchemeEmbeddingModel.findOneAndUpdate(
        { schemeId: scheme._id },
        { schemeId: scheme._id, embedding, textChunk, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      indexed += 1;
    } catch (err) {
      skipped += 1;
      logger.error({ err, slug: scheme.slug }, 'Failed to embed scheme.');
    }
  }

  logger.info({ indexed, skipped }, 'Embedding build complete.');
  return { indexed, skipped };
};

const isDirectRun = process.argv[1]?.includes('embed');

if (isDirectRun) {
  (async () => {
    try {
      await connectDB();
      await buildEmbeddings();
    } catch (err) {
      logger.error({ err }, 'Embedding build failed.');
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}
