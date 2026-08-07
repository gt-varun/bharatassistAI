# Translation service

English is the single source of truth. Every user-visible string is a key in
`apps/frontend/src/i18n/locales/en.json`; every other locale file is generated
from it and then reviewed. Nothing in the interface is hardcoded English any
more, and a test fails the build if a key is added without translations.

---

## 1. Running it

```bash
pnpm translate                    # every language, only the missing keys
pnpm translate -- --dry-run       # report coverage, translate nothing
pnpm translate -- --lang gu       # one language
pnpm translate:schemes            # scheme content in the database, not the UI
```

The run is incremental and non-destructive: a key that already has a
translation is never re-translated, so reviewed wording is never overwritten by
a machine. Re-running after adding English keys only fills the new ones.

`--dry-run` needs no provider and no credentials — it is the quickest way to
see where each language stands.

---

## 2. Choosing a provider

Set `TRANSLATION_PROVIDER` in `apps/backend/.env`. With none set, the service
tries Bhashini, then Gemini, then a local IndicTrans2 server, and uses the
first that is configured.

### Bhashini — recommended

The Government of India's own translation mission (ULCA). Free after
registering at [bhashini.gov.in](https://bhashini.gov.in). It is built for the
22 scheduled languages and handles administrative vocabulary better than a
general-purpose model — which matters most here, because this is a register of
government schemes.

```
TRANSLATION_PROVIDER=bhashini
BHASHINI_USER_ID=your_user_id
BHASHINI_API_KEY=your_ulca_api_key
```

### Gemini — quickest to start

Uses the free Google AI Studio tier and the `GEMINI_API_KEY` the backend
already reads for the assistant. Get a key at
[aistudio.google.com](https://aistudio.google.com).

```
TRANSLATION_PROVIDER=gemini
GEMINI_API_KEY=your_key
```

### IndicTrans2 — free forever, no key

AI4Bharat's open-source model, run locally behind a small HTTP wrapper. No
network, no key, no expiry; costs a Python environment and a few GB.

```
TRANSLATION_PROVIDER=indictrans
INDICTRANS_URL=http://localhost:8000
```

The adapter expects `POST /translate` taking
`{ source_lang, target_lang, sentences[] }` and returning `{ translations[] }`.

---

## 3. What the service guarantees

- **Placeholders survive.** A translation that loses or mangles `{{count}}` is
  discarded rather than written; the key stays absent and i18next falls back to
  English. A missing string reads oddly, a broken placeholder is a defect on
  screen.
- **Protected terms stay put.** Aadhaar, PAN, EWS, OBC, DBT, UPI, DPDP Act and
  the product name are passed through untouched. Terms with an accepted
  administrative rendering (*domicile certificate*, *subsidy*, *pension*) are
  pinned per language in `glossary.ts`.
- **Nothing machine-made is presented as checked.** Every generated string is
  recorded in `locales/_provenance.json` with its provider and
  `verified: false`. Scheme translations in the database carry the same flag,
  and the UI already prefers a verified translation over an unverified one.

---

## 4. Reviewing

Machine output is a draft. To promote it:

1. Read the strings for one language against `en.json`.
2. Fix anything stilted — the register is read by citizens on phones, not by
   officials.
3. Set `verified: true` for those keys in `_provenance.json`.

Coverage is enforced separately from review: `languageCoverage()` in
`apps/frontend/src/i18n/config.ts` measures every key against English, and
`getAvailableLanguages()` hides any language below 99%. A part-translated
language is never selectable, so a citizen cannot land in a half-English
screen (§2.4).

---

## 5. Current state

| Language | Status |
|---|---|
| English, Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi | Complete, hand-written, offered in the selector |
| Gujarati, Bengali, Punjabi, Urdu | 217/505 keys — **awaiting a translation run**, hidden from the selector |

The four pending languages are listed in `PENDING_TRANSLATION` in
`apps/frontend/src/i18n/config.test.ts`. Once `pnpm translate` has filled one
and it has been reviewed, remove its code from that list — that is what puts it
under the parity guard and makes it selectable.

---

## 6. Adding a string

1. Add the key and English text to `en.json`.
2. Use it with `t('namespace.key')` — never a literal.
3. Run `pnpm translate`.
4. `pnpm test` fails if any offered language is still missing it.
