# BharatAssist AI — Repository Setup & Team Division Plan

This document covers two things:
1. What must be built/agreed **before** the work is split across 4 people (foundational scaffolding — do this together or assign to one lead, in this order).
2. How to divide the 14 product modules across 4 people once the foundation is in place.

---

## Part 1 — Foundational Setup (Do This Before Splitting Work)

If 4 people start building features on top of nothing shared, you get 4 incompatible codebases. Everything below should exist and be merged to `main` before feature work begins. Budget this as its own short sprint (1 person can lead it, others can review).

### 1.1 Repo & Project Structure
- Create a monorepo (recommended, given a shared TS type layer between frontend and backend):
```
bharatassist-ai/
├── apps/
│   ├── frontend/        # React + TypeScript + TailwindCSS
│   └── backend/         # Node.js + Express.js
├── packages/
│   └── shared-types/    # Shared TS interfaces (Scheme, Profile, EligibilityResult, etc.)
├── docs/
│   ├── prd.md
│   └── repo-setup.md
├── .github/workflows/   # CI
├── .env.example
└── README.md
```
- Agree on package manager (pnpm/yarn workspaces recommended for monorepo) and lockfile discipline.

### 1.2 Environment & Secrets
- `.env.example` at repo root and per-app, listing (without real values): `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_URL`, `GEMINI_API_KEY`, `FRONTEND_URL`, `PORT`.
- Decide where real secrets live (Vercel/Render environment variable dashboards) — never committed.

### 1.3 Shared Type Contracts
Before anyone builds a feature, agree the core data shapes in `packages/shared-types`, since Search, Eligibility, Checklist, and AI Assistant all read/write the same entities:
- `Scheme` (id, name, department, description, eligibilityRules, documents[], benefitType, state/central, applicationMode, officialPortalUrl, lastVerifiedAt, sourceRef)
- `CitizenProfile` (state, district, age, gender, occupationCategory, incomeBand, educationLevel, category, disabilityStatus, ...)
- `EligibilityResult` (status: Eligible/PartiallyEligible/NotEligible, reasons[], missingRequirements[], alternativeSchemeIds[])
- `DocumentChecklistItem` (label, status: required/missing, howToObtain)
- `User` (id, phone/email, roles, preferredLanguage)

Lock these down early — they are the contract every feature-owner builds against.

### 1.4 Base Backend Scaffolding
- Express app with: centralized error-handling middleware, request validation layer, JWT auth middleware (access + refresh token verification), consistent API response envelope (`{ success, data, error }`), CORS locked to frontend origin, rate limiting on auth/OTP routes.
- MongoDB Atlas connection module + base Mongoose (or equivalent) schema conventions matching `shared-types`.
- Route folder convention (one folder per module: `auth/`, `schemes/`, `eligibility/`, `checklist/`, `assistant/`, `profile/`) so 4 people can work in parallel without touching each other's files.

### 1.5 Base Frontend Scaffolding
- React + TypeScript + Vite (or agreed bundler) with TailwindCSS configured.
- Design tokens: color palette, typography scale, spacing scale — agreed once, used everywhere (see PRD §12 accessibility requirements — large-text mode needs this baked in from the start).
- Routing structure matching the Information Architecture in the PRD (§14).
- Shared UI primitives (Button, Input, Card, Modal, LanguageSelector, LoadingState, EmptyState) built once, reused by all 4 people.
- API client wrapper (fetch/axios instance with base URL, auth token attachment, refresh-on-401 handling).
- i18n scaffolding (library choice, translation file structure per language) — even if only English + Hindi have real content at first, the mechanism must exist before feature screens are built.

### 1.6 AI Service Wrapper
- A single backend module wrapping the Gemini API (`services/ai/geminiClient.ts` or similar): handles prompt construction, retrieval-context injection, response parsing, and error handling.
- This wrapper is the only place that calls Gemini — feature code calls this wrapper, never the API directly, so grounding rules (PRD §9) are enforced in one place.

### 1.7 CI & Branching
- Branch strategy: `main` (protected), feature branches `feature/<module-name>`, PR review required before merge.
- CI on PR: lint, type-check, build both apps.
- Seed script for a small set of sample schemes in MongoDB so all 4 people can develop against real-shaped data from day one.

### 1.8 Definition of "Foundation Done"
Foundation is complete when: repo structure exists, shared types are merged, a logged-in test user can hit a protected route, one sample scheme can be fetched from DB → API → frontend end-to-end, and i18n renders at least one string in 2 languages. That vertical slice proves the whole stack is wired before 4 people fan out.

---

## Part 2 — Dividing the 14 Modules Across 4 People

Grouped by shared data/UI surface so each person owns a coherent slice with minimal cross-editing of the same files. Each person owns both frontend and backend for their slice (full-stack ownership per feature area), assuming a 4-person full-stack team; adjust if your team splits frontend/backend instead.

### Person A — Discovery & Content
**Modules:** Landing Page, Smart Scheme Search, Browse Categories, Scheme Details
- Owns: search API (keyword + filter + natural-language query parsing), category taxonomy, scheme detail page/API, landing page.
- Depends on: `Scheme` shared type, seeded scheme data.
- Hands off to: Person B (Eligibility Checker is launched from Scheme Details), Person C (AI Assistant reads the same scheme retrieval layer).

### Person B — Eligibility & Application Journey
**Modules:** Eligibility Checker, Application Guidance, Personalized Document Checklist, Compare Schemes
- Owns: eligibility rule engine (deterministic evaluation), application field/document walkthrough content model, checklist generation logic, comparison view.
- Depends on: `Scheme.eligibilityRules` and `Scheme.documents` structure from Person A's scheme model, `CitizenProfile` from Person D.
- This is the most logic-heavy slice — pair with Person D early on the eligibility rule format.

### Person C — AI Assistant & Recommendations
**Modules:** AI Assistant, Recommendation Engine
- Owns: Gemini API wrapper (built during foundation, extended here), retrieval-augmented query pipeline, intent classification, recommendation scoring/ranking logic.
- Depends on: Search's retrieval layer (Person A) — the assistant should reuse it, not duplicate it. Also depends on `CitizenProfile` (Person D) for profile-based recommendations.
- Also reasonable owner of the **Knowledge Update System** background service (§17.6 of PRD) if a 5th surface is needed, since it shares the extraction/embedding pipeline with retrieval — otherwise treat as a stretch/backend-only task assigned to whoever has capacity after MVP.

### Person D — Identity, Profile & Platform
**Modules:** Authentication, Citizen Profile, Saved Schemes, Multilingual Support (mechanism ownership — content/translation work is shared)
- Owns: JWT auth flows (OTP + email/password), profile CRUD, saved-schemes state, i18n infrastructure and language-switching UX, account settings (data export/delete for DPDP compliance).
- This slice is a dependency for almost everyone (profile data flows into B and C, auth gates saved/profile features) — prioritize Auth + Profile in week 1.

### Cross-Cutting Coordination Points
- **`Scheme` schema** (Person A) is read by B, C — freeze its shape early, changes need a quick sync.
- **`CitizenProfile` schema** (Person D) is read by B, C — same rule.
- **Design system / shared UI primitives** — built in the foundation phase, not owned by any one feature person; changes to shared components should be flagged in PR review since all 4 people depend on them.
- **i18n strings** — each person adds their own module's translation keys, but Person D owns the i18n mechanism and enforces the "full coverage before a language ships" rule from PRD §12.

### Suggested Order of Work
1. Foundation (Part 1) — 1 lead, ~3-5 days, reviewed by all.
2. Person D ships Auth + minimal Profile first (everyone else needs a logged-in user to test against).
3. Person A ships Search + Scheme Details in parallel (everyone else needs real scheme data to build against).
4. Person B and Person C build in parallel once A and D's slices are usable, syncing on the shared schemas above.
5. Integration pass across all 4 slices before MVP freeze (see PRD §21 MVP Scope for exact feature cut).
