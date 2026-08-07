# Setup Prompt — BharatAssist AI Foundation

Paste this into your coding agent (Claude Code or similar) inside the repo root, with `docs/prd.md`, `docs/repo-setup.md`, `docs/development.md`, `docs/scheme-database.md`, `docs/tech-stack.md`, and the four `docs/person-*.md` files already present.

---

## PROMPT

```
You are setting up the foundational scaffolding for BharatAssist AI, a government
scheme discovery platform for Indian citizens. Full context is in the docs/ folder
— read docs/prd.md, docs/repo-setup.md, docs/scheme-database.md, docs/tech-stack.md,
and docs/development.md before writing any code. Do not skip this — the field
names, API conventions, module boundaries, and library choices defined there are
binding, and the four docs/person-*.md files depend on everything you build here
matching those specs exactly.

docs/tech-stack.md is the binding library list. Do not substitute alternatives
(e.g. no Redux/Zustand, no GraphQL, no Joi instead of Zod, no Yarn instead of
pnpm) even if they seem equivalent — the four people building on top of this
foundation are told in their own docs to expect exactly these choices.

Your job is ONLY the foundation — the shared scaffolding that four senior
developers will build features on top of in parallel, each merging to `main`
via PR. You are not building any of the 14 product features yourself. When
this is done, each person should be able to clone the repo, run one setup
command, and start building their own module immediately against real,
working infrastructure — not mocks.

Complete the following, in this order, committing to `main` as you go so each
step is reviewable independently:

## 1. Monorepo structure
Set up a pnpm workspace monorepo (pnpm per docs/tech-stack.md §7 — not yarn/npm
workspaces) matching docs/repo-setup.md §1.1:
  bharatassist-ai/
  ├── apps/frontend   (React 18 + TypeScript + Vite + TailwindCSS)
  ├── apps/backend    (Node.js 20 LTS + Express + TypeScript)
  ├── packages/shared-types
  ├── docs/           (already populated — do not modify)
  ├── .github/workflows/
  └── .env.example

Configure workspace linking so apps/backend and apps/frontend can both import
from packages/shared-types. Add ESLint + Prettier configured once at the repo
root (shared config, per docs/tech-stack.md §1/§2 — not per-app configs) and
Husky + lint-staged for pre-commit checks.

## 2. Shared type contracts
In packages/shared-types, define TypeScript interfaces for every entity in
docs/scheme-database.md — Scheme (with nested EligibilityRules,
RequiredDocument, ApplicationField, Translations), User, CitizenProfile,
EligibilityResult, DocumentChecklistItem, SavedScheme, ConversationMessage,
KnowledgeUpdateLogEntry. Field names and types must match
docs/scheme-database.md exactly, since all four people's backend code will
import these directly. Export everything from a single package index.

## 3. Environment & secrets
Create .env.example at the root and inside apps/backend and apps/frontend
listing (placeholder values only, never real secrets):
MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, CLOUDINARY_URL, GEMINI_API_KEY,
FRONTEND_URL, PORT. Add a README section explaining that real values go into
Vercel/Render environment variable dashboards, never committed.

## 4. MongoDB Atlas connection + collections
Set up the MongoDB connection module in apps/backend using the real
MONGODB_URI from env. Create Mongoose (or native driver) schemas for every
collection in docs/scheme-database.md — schemes, users, citizenProfiles,
eligibilityResults, documentChecklists, savedSchemes, conversations,
knowledgeUpdateLog — with the exact fields, types, and indexes specified
there (§2 through §9), including the compound and unique indexes listed
under each collection. Set up the Atlas Vector Search index configuration
needed for the schemes embeddings companion collection described in
docs/scheme-database.md §2 (indexes section).

## 5. Base backend scaffolding
In apps/backend, build (libraries per docs/tech-stack.md §2 — use these exact
packages, not substitutes):
- Mongoose as the ODM, schemas matching docs/scheme-database.md field-for-field
- Centralized error-handling middleware
- Request validation middleware using Zod (not Joi), at the route boundary
- JWT auth middleware using jsonwebtoken + bcrypt for password hashing:
  verifies access tokens, handles the refresh-token rotation pattern described
  in docs/person-4-identity-platform.md §3.2 (short-lived access token,
  rotating refresh token, refreshTokenVersion invalidation on logout/password
  change)
- OTP delivery abstracted behind a single services/otp module (MSG91 or Twilio
  Verify — pick one per docs/tech-stack.md §2, document the choice in the
  README) so the provider can be swapped later without touching route code
- A consistent API response envelope { success, data, error } used by every
  route
- CORS locked to FRONTEND_URL from env
- Rate limiting via express-rate-limit, applied specifically to auth/OTP routes
- Structured logging via pino — never log PII (phone, income, disability
  status) or raw Gemini prompts/responses containing user data in plaintext
- Route folder convention: one folder per module — auth/, schemes/,
  eligibility/, checklist/, guidance/, compare/, assistant/, recommendations/,
  profile/, saved/ — matching the endpoint tables in each
  docs/person-*.md file, so each person can work in their own folder without
  touching anyone else's files
- A health-check endpoint (/api/health) that confirms DB connectivity

## 6. Base frontend scaffolding
In apps/frontend, build (libraries per docs/tech-stack.md §1 — use these exact
packages, not substitutes):
- React Router v6 routing structure matching the Information Architecture in
  docs/prd.md §14
- Design tokens (color palette, typography scale, spacing scale) configured
  in tailwind.config.ts — needs to support the large-text accessibility mode
  mentioned in docs/prd.md §12
- TanStack Query (React Query) set up for server-state fetching; plain
  React Context/useState for local UI state — no Redux/Zustand
- lucide-react wired in for icons
- Shared UI primitives: Button, Input, Card, Modal, LanguageSelector,
  LoadingState, EmptyState — built once, documented with basic usage examples,
  ready for reuse by all four people
- React Hook Form + Zod resolver set up as the form-handling pattern (used
  later for Profile, Eligibility question flow, Auth forms)
- An Axios-based API client wrapper with base URL from env, automatic auth
  token attachment, and refresh-on-401 handling
- i18next + react-i18next scaffolding: translation file structure per language
  code (en, hi, kn, ta, te, ml, mr, gu, bn, pa, ur), RTL layout support
  wired for ur, and the "hide incomplete languages from the selector" rule
  from docs/prd.md §12 enforced at the config level (a language only appears
  in LanguageSelector once its translation file passes a completeness check)
- Vitest + React Testing Library configured and runnable

## 7. Gemini API wrapper
In apps/backend, build a single module (services/ai/geminiClient.ts) that
wraps calls to the real Gemini API using GEMINI_API_KEY from env, per
docs/tech-stack.md §5. This must be the ONLY place in the codebase that calls
Gemini directly — expose one function for chat/completion (accepts a prompt +
retrieved context, returns a parsed response) and one function for generating
embeddings (verify the current Gemini embedding model name against the
official API docs at build time, per docs/tech-stack.md §3, since model names
version over time), so docs/person-1-discovery-content.md's semantic search
and docs/person-3-ai-recommendations.md's assistant/knowledge-update work both
plug into this without touching the raw API.

## 8. CI & branch protection
Set up .github/workflows/ci.yml (GitHub Actions, per docs/tech-stack.md §7) to
run on every PR: pnpm install, lint, type-check, build both apps. Configure
branch protection on `main` requiring this CI to pass plus at least one
review before merge, per docs/development.md §3.2. Note (do not configure
yet, just document in README): frontend auto-deploys from `main` to Vercel,
backend auto-deploys from `main` to Render, per docs/tech-stack.md §6 — actual
project linking happens once real hosting accounts are ready.

## 9. Real seed data
Write a seed script (apps/backend/scripts/seed.ts or similar) that inserts a
small set of REAL government scheme records (not fabricated placeholders) —
pull actual scheme names, real eligibility criteria, and real official portal
URLs for a handful of schemes across different segments (at least one
student scholarship, one farmer scheme, one women/MSME scheme, one senior
citizen scheme), matching the exact shape in docs/scheme-database.md §10
(including a filled-out eligibilityRules, requiredDocuments,
applicationFields, and at least one verified Hindi translation per scheme).
Also seed one test user with a citizen profile.

## 10. Vertical slice verification
Prove the whole stack is wired correctly end-to-end before considering this
done, per docs/repo-setup.md §1.8:
- A test user can log in via OTP flow and receive a valid JWT
- That authenticated request can hit a protected route
- One seeded real scheme can be fetched: MongoDB → backend API → frontend
  Scheme Details page render
- The language selector renders correctly in at least English and Hindi
- The health-check endpoint confirms DB + Gemini API key are both reachable

## 11. Documentation
Update the root README.md with: prerequisites, first-time setup steps,
how to run both apps, how to run the seed script, and a link to
docs/development.md for conventions. Do not modify any file in docs/ itself.

Do not implement any of the 14 product feature modules described in
docs/prd.md §11 or in the docs/person-*.md files — that work is explicitly
reserved for the four people building in parallel after this foundation is
merged. Stop once the vertical slice in step 10 passes.
```

---

## How to use this
1. Make sure `docs/prd.md`, `docs/repo-setup.md`, `docs/development.md`, `docs/scheme-database.md`, `docs/tech-stack.md`, and the four `docs/person-*.md` files are already committed to the repo.
2. Paste the prompt block above into your coding agent at the repo root.
3. Once step 10's vertical slice passes and CI/branch protection is live on `main`, you're ready to tell the 4 developers to start — each opens their own `docs/person-N-*.md` (plus `docs/tech-stack.md` for the exact libraries they should use), creates a `feature/...` branch, and starts building directly against the real seeded data and shared scaffolding.
