/**
 * Translates the register's own content — scheme names, summaries and the
 * plain-language eligibility line — into every supported language.
 *
 *   pnpm translate:schemes                    # everything missing
 *   pnpm translate:schemes -- --lang hi       # one language
 *   pnpm translate:schemes -- --limit 20      # a first pass on 20 records
 *
 * The interface strings live in files; scheme text lives in the database, on
 * `schemes.translations`. Both go through the same provider so a citizen
 * reading in Bengali gets a Bengali page rather than Bengali chrome wrapped
 * around English content.
 *
 * Every record written here carries `verified: false`. The UI already prefers
 * a verified translation and falls back to English otherwise, so nothing
 * unchecked is presented as authoritative.
 */
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { SchemeModel } from '../models/Scheme.js';
import { logger } from '../utils/logger.js';
import { resolveProvider, translateMany } from '../services/translation/index.js';

const LANGUAGES = ['hi', 'kn', 'ta', 'te', 'ml', 'mr', 'gu', 'bn', 'pa', 'ur'];

/** The fields a reader actually sees before deciding to open a record. */
const FIELDS = ['name', 'shortDescription', 'eligibilitySummaryPlain'] as const;

async function main() {
  const args = process.argv.slice(2);
  const langArg = args.indexOf('--lang');
  const limitArg = args.indexOf('--limit');
  const targets = langArg >= 0 ? [args[langArg + 1]] : LANGUAGES;
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : 0;

  const provider = resolveProvider();
  if (!provider) {
    logger.error(
      'No translation provider configured. Set TRANSLATION_PROVIDER and its credentials.'
    );
    process.exitCode = 1;
    return;
  }

  await connectDB();
  const query = SchemeModel.find({});
  if (limit > 0) query.limit(limit);
  const schemes = await query;

  logger.info(
    `Translating ${schemes.length} schemes into ${targets.length} languages with "${provider.name}".`
  );

  for (const lang of targets) {
    let translated = 0;
    let skipped = 0;

    for (const scheme of schemes) {
      const existing = scheme.translations?.[lang];

      // A verified translation is somebody's reviewed work. Never overwrite it.
      if (existing?.verified) {
        skipped += 1;
        continue;
      }
      // Nor re-spend a call on machine output that is already present.
      if (existing && FIELDS.every((f) => existing[f])) {
        skipped += 1;
        continue;
      }

      const sources = FIELDS.map((f) => scheme[f] as string).filter(Boolean);
      if (sources.length === 0) continue;

      const results = await translateMany(sources, {
        targetLang: lang,
        context: 'government scheme record',
        provider
      });

      const patch: Record<string, unknown> = { verified: false };
      FIELDS.forEach((field, i) => {
        if (results[i]?.text) patch[field] = results[i].text;
      });

      scheme.translations = { ...(scheme.translations ?? {}), [lang]: patch } as any;
      scheme.markModified('translations');
      await scheme.save();
      translated += 1;
    }

    logger.info(`  ${lang}: ${translated} translated, ${skipped} already present`);
  }

  await disconnectDB();
  logger.info('Done. All scheme translations are unverified until a speaker reviews them.');
}

main().catch(async (error) => {
  logger.error({ error }, 'Scheme translation run failed');
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});
