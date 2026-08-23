# Person 3 — AI Assistant & Recommendations

**Modules owned:** AI Assistant, Recommendation Engine (+ Knowledge Update System)
**Reference:** `prd.md` §9, §11.10, §11.14, §17.3, §17.4, §17.6

---

## 1. Scope Summary
You own the platform's AI surface and personalization logic. The non-negotiable rule across your entire slice: **the AI never invents information** — every factual claim traces back to a real scheme record retrieved via Person 1's retrieval service. This is a grounded retrieval-augmented assistant scoped strictly to the real scheme database, not a general chatbot.

---

## 2. Frontend

### 2.1 AI Assistant
- Persistent chat widget (every page) + a dedicated full-page assistant view.
- Message list with source-scheme references shown alongside factual answers, linking through to Person 1's Scheme Details.
- Language-aware input/output.
- Visually distinct "no matching scheme found" empty-state — must never be mistaken for a normal answer.
- "Proceed with this scheme" hand-off into Person 2's Application Guidance flow.

### 2.2 Recommendation Engine (surfaces)
- Dashboard recommendation list with a real "why recommended" explanation (matched criteria) per card.
- "More like this" on Person 1's Scheme Details page.
- "Because you're eligible for X, you may also qualify for Y," triggered after Person 2's eligibility result comes back positive.

---

## 3. Backend

### 3.1 API Endpoints (`assistant/`, `recommendations/`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/assistant/message` | POST | Send user message, get grounded response + source scheme IDs |
| `/api/assistant/conversations` | GET | Fetch conversation history (logged-in users; guest sessions ephemeral) |
| `/api/recommendations` | GET | Profile-based ranked recommendations |
| `/api/recommendations/similar/:schemeId` | GET | "More like this" |
| `/api/recommendations/cross/:schemeId` | GET | Cross-recommendations after positive eligibility |

### 3.2 Gemini API Wrapper
- Single shared module (`services/ai/geminiClient`) — no other module calls Gemini directly.
- Pipeline: intent classification → retrieval (Person 1's shared service, never a separate index) → context assembly → Gemini call constrained to retrieved context → response parsing → `sourceSchemeIds` attached to the stored message.
- If retrieval returns nothing relevant, short-circuit before the Gemini call and return the empty-state response directly.

### 3.3 Recommendation Scoring
- Hard filters first (state, category eligibility bounds), then soft scoring (segment tag match, income band fit, recency, popularity) on remaining candidates.
- Always return the matched-criteria list alongside the score.

### 3.4 Knowledge Update System — implemented
- Background pipeline in `services/knowledge-update/`: `sourceRegistry.ts` (the real, hand-curated watch list of official portals) → `fetcher.ts` (monitor: fetches HTML or PDF, live-tested against real .gov.in sources) → `diffDetector.ts` (detect: SHA-256 content hash against `sourceSnapshots`, skips unchanged sources) → `extractor.ts` (extract: reuses the single Gemini/Groq wrapper, confidence scored deterministically from the extraction's own completeness/consistency — never the model's self-reported number) → `pipeline.ts` (validate + update `schemes` + regenerate embeddings + log to `knowledgeUpdateLog`).
- Below-threshold, ambiguous, or non-allow-listed-portal extractions are never written to `schemes` — only logged as `flagged_for_review`, queryable via `reviewQueue.ts` (`getPendingReview`). No admin UI — that queue is a query, not a screen, per docs/rules.md #28.
- Notify (PRD §17.6 step 8) is implemented as a computed, logged list of affected saved-scheme users per update — real delivery (email/SMS/push) is Notification-module infrastructure that doesn't exist anywhere in this codebase yet (PRD §21 places it in V2); this pipeline stops at producing the list a real channel would consume.
- Triggered via `pnpm --filter backend knowledge-update` or the scheduled `.github/workflows/knowledge-update.yml` (daily cron) — the real "scheduled jobs poll official sources" from PRD §17.6 step 1.

**Beyond the PRD's conceptual pipeline — added on request:**
- **Version history + rollback** (`versioning.ts`, `schemeVersions` collection): every write to `schemes` is snapshotted with who/what/why, queryable per scheme, and reversible via `pnpm --filter backend rollback-scheme`.
- **Field-level writes, not full-document overwrite** (`fieldUpdater.ts`): an update only `$set`s the individual fields that actually changed, and an empty extraction value can never blank out real existing data. This closed a real latent bug in the first version of this pipeline, where a re-verification with a thin extraction would have overwritten good fields with empty ones.
- **Grounded change reasons** (`extractor.ts`'s `changeContext`, `pipeline.ts`'s `buildChangeReason`): a version's `changeReason` cites the source's own stated reason (a circular/notification reference) when there is one, and otherwise says plainly that none was given — never an invented justification.
- **Human feedback loop** (`corrections.ts`, `extractionCorrections` collection): a reviewer can record a correction to an AI extraction via `pnpm --filter backend record-correction`, which applies the fix to the live record and versions it as a `manual` change — real labelled data for future prompt tuning, from day one.

---

## 4. Database

### Collections you own:
- **`conversations`** (full schema: `scheme-database.md` §8) — every assistant message stores `sourceSchemeIds` for auditability.
- **`knowledgeUpdateLog`** (full schema: `scheme-database.md` §9).

### Collections you read:
- `schemes` (Person 1) via the shared retrieval service.
- `citizenProfiles` (Person 4) for recommendation scoring.
- `eligibilityResults` (Person 2) for cross-recommendations.

### Indexes
- `{ userId: 1, updatedAt: -1 }` on `conversations`.
- `{ schemeId: 1, runAt: -1 }` and `{ action: 1, reviewedBy: 1 }` on `knowledgeUpdateLog`.
- Vector index for embeddings, shared with Person 1's retrieval infrastructure.

---

## 5. Workflow
- Feature branches, PR into `main`, reviewed by at least one other person.
- Grounding checks are a required part of your own review before opening a PR: run a spot-check set of prompts and confirm no unsupported claims and correct empty-result fallback, using real scheme data.

## 6. Definition of Done
- Every factual assistant response logs `sourceSchemeIds`; empty-retrieval queries produce the explicit "no match found" response, never a generated guess. — Done.
- Recommendations always show matched-criteria explanations. — Done, on Dashboard, Scheme Details ("More like this"), and the Eligibility Checker result ("because you're eligible...").
- Assistant responds correctly in English + Hindi at minimum. — Done for UI chrome; scheme content and assistant replies inherit whatever language the citizen has selected app-wide.
- First-token latency under 2s p95. — Depends on the configured Groq/Gemini key; unverifiable without one in this environment, but the code path adds no artificial delay.
- Knowledge Update System runs against real official sources, confidence-gates every write, and never auto-publishes an unvalidated portal URL. — Done; see §3.4.

## 7. AI Gateway — architecture upgrade, added on request

Both AI callers (the Assistant, the Knowledge Update extractor) now go through one gateway instead of calling `geminiClient.ts` directly:

- **`services/ai/aiGateway.ts`** — the single `callAI()` choke point. Every call is logged (`caller`, `promptVersion`, `provider`, `model`, `latencyMs`); an optional `cacheKey` dedupes an identical question within a short TTL instead of paying for the same completion twice; the offline fallback response is never cached.
- **`services/ai/prompts.ts`** — prompt versions tracked like code (`ASSISTANT_PROMPT_VERSION`, `EXTRACTION_PROMPT_VERSION`). The prompt text itself stays next to the logic that assembles it; what's versioned is the tag every response is logged against, so a prompt regression is as visible as a bad deploy.
- **Explainability metadata** — every assistant API response carries `explainability: { provider, model, promptVersion, retrievedChunks, latencyMs, cacheHit, generatedAt }`. Live-response-only, never written into the persisted `conversations` shape (frozen per `scheme-database.md` §8).
- **Trust score, distinct from extraction confidence** — `sourceRegistry.ts` now carries a `trustScore` (0–100) per source, independent of how cleanly any given page happens to parse. `pipeline.ts`'s `computeCombinedScore` blends it with extraction confidence (70/30) into the number the publish decision actually gates on — a low-trust source can't be rescued by a clean-looking extraction, and a highly-trusted source still needs a complete one.
- **Source health metrics** — `services/knowledge-update/sourceHealth.ts` tracks success rate, consecutive failures, and fetch time per source in the existing `sourceSnapshots` collection. Internal numbers, not a dashboard (docs/rules.md #28 still holds).
- **Profile-aware assistant context** — `conversationService.ts`'s `buildProfileContext` includes a citizen's own state/occupation/income/category in the grounding context when they're logged in, so answers can be phrased more specifically to their situation. Rule 2 (never declare eligibility) stays absolute regardless.

Deliberately not built, and why: a formal multi-agent framework with per-stage retry/metrics objects, and an in-process event bus — both are real engineering weight for a single sequential pipeline processing a dozen sources a night, with no independent services yet to actually decouple. Revisit if that changes.
