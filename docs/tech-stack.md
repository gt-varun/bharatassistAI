# BharatAssist AI — Tech Stack

Companion to `prd.md`, `repo-setup.md`, `development.md`, and `scheme-database.md`. This is the binding library/tooling list — everyone (foundation setup and all 4 feature owners) builds against these exact choices, not substitutes, so the codebase stays consistent across four people working in parallel.

---

## 1. Frontend

| Concern | Choice | Notes |
|---|---|---|
| Framework | React 18 | |
| Language | TypeScript | Strict mode enabled |
| Build tool | Vite | Fast dev server, used by all 4 people |
| Styling | TailwindCSS + single global stylesheet (`src/index.css`) | Design tokens (colors, type scale, spacing) configured centrally in `index.css` via CSS custom properties in `:root` with `.large-text` scaling mode for PRD §12 accessibility |
| UI Component Library | shadcn/ui | Radix UI primitives with Tailwind styling; installed in `apps/frontend/src/components/ui/`. Dev preview page at `/dev/ui-preview` |
| Routing | React Router v6 | Matches the Information Architecture in `prd.md` §14 |
| State management | React Query (TanStack Query) for server state + React Context/useState for local UI state | No global client-state library (Redux/Zustand) needed at this scope — avoid over-engineering; revisit only if a real cross-cutting state need shows up |
| Forms | React Hook Form + Zod resolver | Used for Profile, Eligibility question flow, Auth forms |
| i18n | i18next + react-i18next | Supports the 11-language requirement, RTL for Urdu, and the "hide incomplete languages" rule |
| Icons | lucide-react | |
| HTTP client | Axios (wrapped in the shared API client from foundation setup) | Handles auth token attachment + refresh-on-401 |
| Testing | Vitest + React Testing Library | |
| Linting/formatting | ESLint + Prettier | Shared config at repo root, not per-app |

## 2. Backend

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js LTS (20.x) | |
| Framework | Express.js | |
| Language | TypeScript | Strict mode enabled |
| ODM | Mongoose | Schemas match `scheme-database.md` field-for-field |
| Validation | Zod | Request validation at the route boundary, shared schemas reused between frontend (React Hook Form) and backend where practical |
| Auth | jsonwebtoken (JWT) + bcrypt (password hashing) | Access token 15 min, rotating refresh token per `person-4-identity-platform.md` §3.2 |
| OTP delivery | MSG91 or Twilio Verify (pick one at foundation setup, whichever has better India SMS deliverability/pricing at the time) | Abstracted behind a single `services/otp` module so the provider can be swapped without touching route code |
| Rate limiting | express-rate-limit | Applied specifically to `auth/otp/*` routes |
| Logging | pino | Structured logs; never log PII (phone, income, disability status) or Gemini prompts/responses containing user data in plaintext |
| Testing | Jest or Vitest + Supertest | Match whichever the frontend uses for consistency |
| Linting/formatting | ESLint + Prettier | Shared root config |

## 3. Database

| Concern | Choice | Notes |
|---|---|---|
| Primary database | MongoDB Atlas | Collections and indexes exactly as defined in `scheme-database.md` |
| Semantic search | Atlas Vector Search | Vector index on the `schemes` embeddings companion collection, used by both Smart Search (Person 1) and the AI Assistant (Person 3) — one shared index, not two |
| Embeddings model | Gemini embedding model (`text-embedding-004` or current equivalent at build time — verify against Gemini API docs, since model names version over time) | Called through the same `services/ai` layer as the Gemini chat wrapper |

## 4. Storage

| Concern | Choice | Notes |
|---|---|---|
| File/image storage | Cloudinary | Used for any user-uploaded document images (e.g., checklist attachments) and static scheme-related assets; not used for storing certified legal documents long-term (see `prd.md` Non-Goals) |

## 5. AI

| Concern | Choice | Notes |
|---|---|---|
| LLM | Gemini API | All calls routed through the single `services/ai/geminiClient` wrapper (foundation setup) — no other module calls Gemini directly |
| Grounding pattern | Retrieval-Augmented Generation (RAG) against MongoDB Atlas Vector Search | Per `prd.md` §9 — the AI never answers without retrieved context |

## 6. Hosting & Deployment

| Layer | Choice | Notes |
|---|---|---|
| Frontend hosting | Vercel | Auto-deploy from `main`, preview deployments per PR |
| Backend hosting | Render | Auto-deploy from `main` |
| Environment/secrets | Vercel + Render environment variable dashboards | Never committed to the repo; `.env.example` documents required keys only |

## 7. Dev Tooling & Workflow

| Concern | Choice | Notes |
|---|---|---|
| Package manager | pnpm | Workspace monorepo (`apps/frontend`, `apps/backend`, `packages/shared-types`) |
| Monorepo tooling | pnpm workspaces (Turborepo optional if build times become a problem later — not needed at this scale) | |
| CI | GitHub Actions | Lint, type-check, build on every PR; required to pass before merge to `main` |
| Git hooks | Husky + lint-staged | Pre-commit lint/format check |
| Branching | Feature branches → PR → `main`, 1 review required | Per `development.md` §3.2 |

## 8. Explicitly Not Used (and why)

- **No Redux/Zustand** — React Query + Context covers current state needs; adding a global store now is premature complexity for a team of 4 building in parallel.
- **No GraphQL** — REST is simpler to split cleanly across 4 people's route folders and matches the API conventions already documented.
- **No microservices split** — single Express backend with clear route-folder ownership per person is sufficient at this scale; revisit only post-MVP if a specific module (e.g., Knowledge Update System) needs independent scaling.
- **No admin CMS framework** — per `prd.md`, the Knowledge Update System is a background service in v1, not an admin dashboard.

---

## 9. Version Pinning Note

Pin exact versions in `package.json` (not caret ranges) for anything security-sensitive (jsonwebtoken, bcrypt) so all 4 people and CI run identical versions. Everything else can use caret ranges with `pnpm-lock.yaml` committed as the actual source of truth.
