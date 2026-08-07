/**
 * Fills every locale file from the English one.
 *
 *   pnpm translate:ui                 # every language, only missing keys
 *   pnpm translate:ui -- --lang gu    # one language
 *   pnpm translate:ui -- --dry-run    # report the gap, translate nothing
 *
 * English is the single source of truth: keys are added there, and this walks
 * each locale, finds what it is missing, translates only that, and writes the
 * file back with its existing translations untouched. Re-running is cheap and
 * safe — a key already present is never re-translated, so nobody's reviewed
 * wording is silently overwritten by a machine.
 *
 * Provenance lands in `_provenance.json` beside the locales, recording which
 * provider produced each key and whether a human has confirmed it.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { resolveProvider, translateMany } from '../services/translation/index.js';

/**
 * Walk up from wherever the script was started until the workspace root shows
 * itself, so this works whether it is run from the repo root or from
 * apps/backend. (`import.meta` is unavailable — this package compiles to CJS.)
 */
function findLocalesDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i += 1) {
    const candidate = path.join(dir, 'apps/frontend/src/i18n/locales');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error('Could not locate apps/frontend/src/i18n/locales from ' + process.cwd());
}

const LOCALES_DIR = findLocalesDir();
const PROVENANCE_FILE = path.join(LOCALES_DIR, '_provenance.json');

type Nested = { [key: string]: string | Nested };

interface Provenance {
  [lang: string]: { [dottedKey: string]: { provider: string; verified: boolean; at: string } };
}

function flatten(obj: Nested, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[dotted] = value;
    else Object.assign(out, flatten(value, dotted));
  }
  return out;
}

function setDeep(obj: Nested, dotted: string, value: string): void {
  const parts = dotted.split('.');
  let cursor = obj;
  for (const part of parts.slice(0, -1)) {
    if (typeof cursor[part] !== 'object' || cursor[part] === null) cursor[part] = {};
    cursor = cursor[part] as Nested;
  }
  cursor[parts[parts.length - 1]] = value;
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/**
 * The key's namespace, handed to the provider as context. `savedPage.stage`
 * becomes "savedPage" — enough for a model to tell a button from a paragraph.
 */
function contextOf(dottedKey: string): string {
  return dottedKey.split('.')[0];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const langArg = args.indexOf('--lang');
  const onlyLang = langArg >= 0 ? args[langArg + 1] : undefined;

  const english = readJson<Nested>(path.join(LOCALES_DIR, 'en.json'), {});
  const englishFlat = flatten(english);
  const englishKeys = Object.keys(englishFlat);

  const targets = fs
    .readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'en.json' && !f.startsWith('_'))
    .map((f) => path.basename(f, '.json'))
    .filter((lang) => !onlyLang || lang === onlyLang);

  logger.info(`English has ${englishKeys.length} keys. Checking ${targets.length} locales.`);

  // Report the gap first: with no provider configured this is still useful,
  // and it is the only part of the run that cannot fail.
  const gaps = new Map<string, string[]>();
  for (const lang of targets) {
    const localeFlat = flatten(readJson<Nested>(path.join(LOCALES_DIR, `${lang}.json`), {}));
    const missing = englishKeys.filter((k) => !localeFlat[k] || localeFlat[k].trim() === '');
    gaps.set(lang, missing);
    const done = englishKeys.length - missing.length;
    const pct = Math.round((done / englishKeys.length) * 100);
    logger.info(`  ${lang}: ${done}/${englishKeys.length} (${pct}%)${missing.length ? ` — ${missing.length} missing` : ' ✓'}`);
  }

  const totalMissing = [...gaps.values()].reduce((n, m) => n + m.length, 0);
  if (totalMissing === 0) {
    logger.info('Every locale is complete. Nothing to translate.');
    return;
  }

  if (dryRun) {
    logger.info(`Dry run: ${totalMissing} strings would be translated.`);
    return;
  }

  const provider = resolveProvider();
  if (!provider) {
    logger.error(
      'No translation provider configured. Set one of:\n' +
        '  TRANSLATION_PROVIDER=bhashini  BHASHINI_USER_ID=… BHASHINI_API_KEY=…\n' +
        '  TRANSLATION_PROVIDER=gemini    GEMINI_API_KEY=…\n' +
        '  TRANSLATION_PROVIDER=indictrans INDICTRANS_URL=http://localhost:8000'
    );
    process.exitCode = 1;
    return;
  }

  logger.info(`Translating ${totalMissing} strings with "${provider.name}".`);
  const provenance = readJson<Provenance>(PROVENANCE_FILE, {});

  for (const [lang, missing] of gaps) {
    if (missing.length === 0) continue;

    const localeFile = path.join(LOCALES_DIR, `${lang}.json`);
    const locale = readJson<Nested>(localeFile, {});
    provenance[lang] = provenance[lang] ?? {};

    // Grouped by namespace so every provider call shares one context.
    const byContext = new Map<string, string[]>();
    for (const key of missing) {
      const ctx = contextOf(key);
      byContext.set(ctx, [...(byContext.get(ctx) ?? []), key]);
    }

    let written = 0;
    for (const [ctx, keys] of byContext) {
      const results = await translateMany(
        keys.map((k) => englishFlat[k]),
        { targetLang: lang, context: ctx, provider }
      );

      keys.forEach((key, i) => {
        const result = results[i];
        if (!result.text) return; // Left absent; i18next falls back to English.
        setDeep(locale, key, result.text);
        provenance[lang][key] = {
          provider: result.provider,
          verified: result.verified,
          at: new Date().toISOString()
        };
        written += 1;
      });
    }

    writeJson(localeFile, locale);
    logger.info(`  ${lang}: wrote ${written}/${missing.length} translations`);
  }

  writeJson(PROVENANCE_FILE, provenance);
  logger.info(
    'Done. Machine translations are recorded as unverified in _provenance.json — ' +
      'have a speaker read them before treating them as checked.'
  );
}

main().catch((error) => {
  logger.error({ error }, 'Locale translation run failed');
  process.exit(1);
});
