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

### 3.4 Knowledge Update System
- Background pipeline: monitor real official sources → detect new/changed notifications → extract structured data (reusing the Gemini wrapper) → validate against a confidence threshold → write to `schemes` (`lastVerifiedAt`, `sourceRef`, `extractionConfidence`) → regenerate embeddings → refresh search indexes → log to `knowledgeUpdateLog`.
- Low-confidence extractions queue for review rather than auto-publish.
- No admin UI in v1 — internal background service only.

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
- Every factual assistant response logs `sourceSchemeIds`; empty-retrieval queries produce the explicit "no match found" response, never a generated guess.
- Recommendations always show matched-criteria explanations.
- Assistant responds correctly in English + Hindi at minimum.
- First-token latency under 2s p95.
