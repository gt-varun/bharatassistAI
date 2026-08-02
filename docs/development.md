# BharatAssist AI — Development Guide

Companion to `prd.md` and `repo-setup.md`. This covers how the team actually works day-to-day once the foundation (repo-setup.md Part 1) is in place: local setup, conventions, scripts, testing, and definition of done.

---

## 1. Prerequisites

- Node.js LTS (18.x or 20.x)
- pnpm (or yarn, whichever the team locks in during foundation setup)
- MongoDB Atlas account (shared dev cluster, or local MongoDB for offline dev)
- Cloudinary account (for document/image upload testing)
- Gemini API key (for AI Assistant work)
- Git

## 2. First-Time Local Setup

1. Clone the repo, install dependencies at the root (workspace install).
2. Copy `.env.example` → `.env` in both `apps/frontend` and `apps/backend`; fill in dev-cluster MongoDB URI, JWT secrets (any dev value), Cloudinary dev credentials, Gemini dev API key.
3. Run the seed script to populate a small set of sample schemes, sample citizen profiles, and one test user — this is the data every module builds against so everyone sees the same records locally.
4. Start backend, then frontend. Confirm the vertical-slice check from `repo-setup.md` §1.8 still passes on your machine (login works, one seeded scheme loads end-to-end).

## 3. Repo Conventions

### 3.1 Folder ownership
Each of the 4 people works primarily inside their own route/feature folder (see `repo-setup.md` Part 2). Shared files — `packages/shared-types`, UI primitives, the auth middleware, the Gemini wrapper — are edited via PR with a second reviewer, since everyone depends on them.

### 3.2 Branching
- `main` is protected; no direct commits.
- Branch naming: `feature/<module>-<short-description>` (e.g., `feature/eligibility-rule-engine`).
- One PR per module increment where possible — keep PRs small enough to review in one sitting.
- PR must pass CI (lint, type-check, build) before merge.

### 3.3 Commit style
- Conventional-commit-style prefixes recommended: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` — makes changelogs and roadmap tracking easier as the 4 slices merge in parallel.

### 3.4 API conventions
- Every backend route returns the shared response envelope `{ success, data, error }` (established in foundation setup) — no ad-hoc response shapes.
- Validation happens at the route boundary before hitting business logic.
- Anything that reads/writes `Scheme` or `CitizenProfile` imports the type from `packages/shared-types` — never redefines it locally.

### 3.5 AI Assistant conventions (Person C, but binding on anyone touching AI code)
- All Gemini calls go through the shared wrapper (`services/ai/geminiClient`), never called directly from route handlers.
- Every AI response that states a scheme fact must carry the source scheme ID(s) used, logged server-side for traceability (PRD §12, Auditability).
- No feature may bypass retrieval grounding — if this constraint blocks a feature idea, that's a signal to flag it to product, not to work around it.

## 4. Testing Strategy

| Layer | Approach |
|---|---|
| Backend unit tests | Rule engine (Eligibility), checklist generation logic, recommendation scoring — these are pure logic and should be the most heavily unit-tested pieces |
| API integration tests | Auth flows, scheme CRUD-from-seed, eligibility endpoint against seeded schemes |
| Frontend component tests | Shared UI primitives, form flows (eligibility question flow, checklist view) |
| Manual/E2E | Full guest journey and full registered journey (PRD §16) run manually before each milestone freeze |
| AI grounding checks | Manual spot-check set of prompts run against the assistant per release — confirm no unsupported claims, confirm empty-result fallback triggers correctly for out-of-scope queries |

## 5. Definition of Done (per module)

A module is "done" for MVP when:
- Matches its functional requirements in `prd.md` §11.
- Has unit/integration test coverage for its core logic (not just UI).
- Works correctly in at least English + Hindi (MVP language bar per `prd.md` §21).
- Passes accessibility basics (keyboard navigable, screen-reader labeled, meets WCAG 2.1 AA per `prd.md` §12).
- Reviewed by at least one other team member who isn't its primary owner.

## 6. Local Scripts (naming convention — implement per your chosen tooling)

- `dev` — run both apps in watch mode.
- `seed` — populate dev database with sample schemes/profiles/users.
- `lint` / `typecheck` / `build` — used by CI, runnable locally before pushing.
- `test` — run unit + integration suites.

## 7. Milestone Cadence

- **Week 0:** Foundation complete (repo-setup.md Part 1).
- **Weeks 1–2:** Person D ships Auth + minimal Profile; Person A ships Search + Scheme Details.
- **Weeks 2–4:** Person B and Person C build in parallel against A and D's slices.
- **Week 5:** Integration pass across all four slices; MVP scope freeze per `prd.md` §21.
- **Week 6:** Bug bash, accessibility pass, language coverage check (English/Hindi/Kannada per MVP), release.

## 8. When Requirements Are Unclear

If a module's behavior isn't fully specified in `prd.md`, don't guess silently — flag it in the relevant PR or a short written note, propose the interpretation you're going with, and proceed. This keeps the 4 parallel slices from drifting apart on assumptions that weren't actually agreed.
