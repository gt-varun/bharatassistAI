# BharatAssist AI — Rules

Binding rules for everyone working on this repo — foundation, all 4 feature owners, anyone else who joins later. These are not suggestions; PRs that violate these should be rejected in review regardless of how good the feature work is otherwise.

---

## 1. Git & Workflow Rules

1. **Never commit directly to `main`.** All work happens on a `feature/<module>-<short-description>` branch, merged via PR.
2. **`main` is protected** — requires CI to pass (lint, typecheck, test, build) **and** at least one review from another person before merge.
3. **No force-pushing to `main`**, ever, under any circumstance.
4. **One PR per logical increment.** Don't bundle unrelated changes (e.g., a feature + an unrelated refactor) into one PR — it makes review meaningless.
5. **PR description must state what changed and why**, and flag explicitly if it touches shared/cross-cutting code (see §3).
6. **Do not merge your own PR without a review**, even if you're confident it's correct — that's the entire point of the second-reviewer rule.
7. **Commit messages use conventional prefixes**: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

## 2. Docs Are Binding, Not Reference Material

8. **`docs/prd.md`, `docs/tech-stack.md`, `docs/scheme-database.md`, `docs/repo-setup.md`, and `docs/development.md` are the source of truth.** If code and docs disagree, that's a bug in the code (or a signal the doc needs a deliberate, reviewed update) — not license to improvise.
9. **Do not substitute libraries** listed in `docs/tech-stack.md` for "equivalent" alternatives (no Redux/Zustand instead of TanStack Query, no Joi instead of Zod, no Yarn instead of pnpm, no CSS Modules instead of the global stylesheet) without updating the doc first and getting it reviewed.
10. **Never edit another person's `docs/person-N-*.md` file** to redefine their scope unilaterally — if scope needs to shift, raise it, agree, then edit.
11. **Any change to a shared contract must be flagged in the PR** and reviewed by someone outside the module that changed it: this includes `packages/shared-types`, the `Scheme` schema, the `CitizenProfile` schema, the JWT auth middleware, the Gemini client wrapper, and any shadcn/ui primitive in `components/ui/`.

## 3. Ownership & Boundaries

12. **Stay inside your own route folder / module folder** unless you're fixing a bug in shared infra with the owning person's awareness. Person 1 doesn't edit Person 2's `eligibility/` routes; Person 3 doesn't touch Person 4's `auth/` middleware.
13. **The `schemes` collection has two contributors by design** (Person 1 owns discovery fields, Person 2 owns eligibility/document/application fields) — coordinate before changing its shape; don't let it become uncoordinated by six other people quietly adding fields.
14. **Only `services/ai/geminiClient.ts` may call the Gemini API.** No route handler, no component, no script calls Gemini directly — ever. This is what makes AI-response grounding auditable.
15. **The Knowledge Update System is the only writer of automated updates to `schemes`.** Manual edits during development are fine; in the shipped system, that pipeline is the sole automated writer.

## 4. AI & Data Integrity Rules

16. **The AI Assistant never invents information.** Every factual claim it makes must trace back to a specific retrieved scheme record. If retrieval returns nothing, the assistant says so explicitly — it does not generate a plausible-sounding guess.
17. **Every AI response that states a fact logs the source scheme ID(s) used** (`sourceSchemeIds` on the `conversations` collection) — this is not optional instrumentation, it's the auditability requirement from the PRD.
18. **Eligibility status is always computed by the deterministic rule engine**, never by the AI Assistant, even when the assistant is explaining or summarizing the result.
19. **Machine-translated eligibility/benefit content must carry `verified: false`** until a human confirms it. Never present unverified translated numbers or legal text as final without a visible caveat.
20. **A language is never exposed in the language selector until its translation file passes the completeness check.** No partial-language ships, even temporarily.

## 5. Security & Privacy Rules

21. **Never commit real secrets.** `.env` files are gitignored; only `.env.example` with placeholder values is committed. Real values live in Vercel/Render dashboards.
22. **Never log PII in plaintext** — phone numbers, income data, disability status, and full Gemini prompts/responses containing user data must be redacted in logs (pino redactors handle this — don't bypass them).
23. **JWT access tokens stay short-lived (15 min)**; refresh tokens rotate and are invalidated via `refreshTokenVersion` on logout/password change. Don't extend token lifetimes "for convenience" during development and forget to revert it.
24. **Rate limiting on auth/OTP routes is mandatory** and must not be disabled, even temporarily, outside of local dev.
25. **Redirect links to official government portals must be validated against an allow-list of gov domains** before rendering — never render an unvalidated external URL as the final application redirect.
26. **DPDP Act compliance is non-negotiable**: profile fields beyond `state` stay optional, users can export their data, and users can delete their account — don't ship a feature that silently makes a field mandatory or removes these rights.

## 6. Product Boundary Rules (What This Platform Is Not)

27. **Never build application submission into the platform.** The platform ends at "the citizen is ready and knows what to do next," then redirects to the official government portal. No internal form ever submits to a government system.
28. **No admin CMS / CRUD dashboard for schemes in v1.** The Knowledge Update System is a background service; manual scheme editing during development is fine, but don't build a user-facing admin panel as a shortcut.
29. **No document vault for certified originals.** Checklist tracking (have/missing) is fine; long-term storage of legally sensitive original documents is out of scope.

## 7. Frontend & Design System Rules

30. **All styling goes through the single global stylesheet + Tailwind utility classes.** No CSS Modules, no styled-components, no per-component scoped CSS files.
31. **New UI needs go through shadcn/ui first** (`npx shadcn add <component>`) — don't hand-roll a component that shadcn already provides. Only build custom (e.g., `EmptyState`) when there's genuinely no equivalent.
32. **Every new shared component must be added to `/dev/ui-preview`** so the other three people can see it before it's used elsewhere.
33. **Large-text accessibility mode must work on every new component** — test it in `/dev/ui-preview` before merging, don't assume it inherits correctly.

## 8. Testing & Definition of Done

34. **No PR merges without passing CI** (lint, typecheck, test, build) — no exceptions, no "I'll fix it in a follow-up."
35. **Logic-heavy code (eligibility rule engine, checklist generation, recommendation scoring) requires unit tests** before merge — not just "it worked when I clicked through it."
36. **A module isn't "done" until it works in at least English + Hindi** (MVP language bar) and meets WCAG 2.1 AA basics (keyboard nav, screen-reader labels).

## 9. Capacitor / Mobile Shell Rules

The product ships as a Capacitor-wrapped native app (`apps/frontend`, `in.bharatassist.app`) in addition to the web build, from the **same** web source — there is no separate mobile codebase. Every rule below exists to keep that true.

39. **Never add `server.url` to `capacitor.config.ts`.** A packaged build loads the assets bundled with it (`webDir: 'dist'`), never a developer's laptop or a hardcoded environment. If you need a different API target, that's `VITE_API_URL` at build time, not a config edit.
40. **Never loosen the WebView security posture.** `androidScheme` stays `https`, `allowMixedContent` stays `false`, and no plugin config may introduce cleartext traffic — even "temporarily for testing." A weakened WebView breaks `crypto.randomUUID()` and Web Crypto usage (the AI Assistant depends on both) by dropping out of a secure context.
41. **Don't call a Capacitor plugin API directly from a component.** Route through a thin platform-abstraction wrapper (mirroring the existing pattern for speech-to-text/text-to-speech, filesystem, network, share) so the same component works unchanged on web (Web Speech API / browser fallback) and native (Capacitor plugin) — check `Capacitor.isNativePlatform()` in the wrapper, not scattered across feature code.
42. **Any new native capability must degrade gracefully on web.** If a feature needs a Capacitor plugin (camera, filesystem, biometrics, etc.), it must still be usable — or clearly and gracefully unavailable, never crash — when the same code runs in a plain browser tab, since the web build remains a first-class target, not a fallback.
43. **Layout must use safe-area-aware units, not fixed pixel offsets, for anything docked to a screen edge.** Headers, bottom nav, sticky composers, and modals must respect `env(safe-area-inset-*)` (notch, Dynamic Island, gesture bar) — this is what makes `overlaysWebView: false` and `Keyboard.resize: 'native'` actually work; don't reintroduce fixed offsets that assume a status-bar-less rectangle.
44. **Never disable or reconfigure `SplashScreen.launchAutoHide` without also keeping the app's own `hide()` call on first paint.** The auto-hide timer is a dead-man's switch for a failed boot — removing it without the explicit hide-on-paint call risks a permanent blank splash screen on native.
45. **Any change to `capacitor.config.ts` is a shared-contract change** (per rule 11) — flag it explicitly in the PR and get it reviewed by someone outside the module that touched it, same as `packages/shared-types` or the Gemini client wrapper.
46. **New/updated native plugins must be added to `apps/frontend/package.json` and go through both `npx cap sync ios` and `npx cap sync android`** before the PR is opened — a plugin only wired on one platform (or only in `package.json` without a sync) is not done.
47. **Voice features (speech-to-text, text-to-speech) must be implemented once, behind the shared platform wrapper, and used by both the AI Assistant and the conversational onboarding flow** (`prd-v2.md` §3–§4) — no separate native-only or web-only voice implementation per feature.
48. **Test any UI change intended to reach the app on both the web build and an actual Capacitor-run target (iOS Simulator or Android emulator/device)** before calling it done — passing in the browser alone does not verify safe-area handling, keyboard resize behavior, or plugin fallbacks.

## 10. When Something Isn't Covered

49. **If a requirement is genuinely unclear or missing from the docs, don't guess silently.** Flag it in the PR or a short written note, propose the interpretation you're going with, and proceed — but write it down so the other three aren't blindsided later.
50. **Never relax a rule in this file to "move faster."** If a rule is actually wrong or outdated, it gets fixed here, in a reviewed PR to `rules.md` itself — not quietly ignored in someone's feature branch.
