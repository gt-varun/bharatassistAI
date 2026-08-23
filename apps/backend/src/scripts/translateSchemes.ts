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
      // `scheme.translations` is a real Mongoose Map here (this loop runs
      // against hydrated documents, not `.lean()` ones, since it needs to
      // `.save()`) — bracket access on a Map never finds anything, so the
      // "don't re-translate what's already there" and "never overwrite a
      // verified translation" checks below would both silently no-op
      // without reading through `.get()` explicitly.
      const existing =
        scheme.translations instanceof Map
          ? scheme.translations.get(lang)
          : (scheme.translations as any)?.[lang];

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

      // Set the one entry on the live Map rather than rebuilding
      // `translations` by spreading it — `{...aMongooseMap}` copies the
      // Map object's own internal Mongoose bookkeeping properties, not its
      // key/value entries, and corrupts the document on save.
      if (!(scheme.translations instanceof Map)) {
        scheme.translations = new Map(Object.entries(scheme.translations ?? {})) as any;
      }
      (scheme.translations as any).set(lang, patch);
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
