# BharatAssist AI — Foundation Scaffolding

BharatAssist AI is a government scheme discovery platform for Indian citizens, providing smart multilingual search, deterministic eligibility evaluation, personalized document checklists, and an AI assistant.

---

## 🚀 Monorepo Architecture

This monorepo uses **pnpm workspaces** matching the bindings in `docs/tech-stack.md`:

```
bharatassist-ai/
├── apps/
│   ├── frontend/        # React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui + React Router v6
│   └── backend/         # Node.js 20 LTS + Express + TypeScript + Mongoose + Zod
├── packages/
│   └── shared-types/    # Shared TypeScript interfaces (Scheme, Profile, Eligibility, etc.)
├── docs/                # Architecture docs & 4 developer slice guides
├── .github/workflows/   # CI Actions
├── .env.example
└── README.md
```

---

## 🎨 UI Component Library & Design System (shadcn/ui)

The frontend uses **shadcn/ui** for UI components with a single global CSS design system supporting **Large-Text Accessibility Mode** (`docs/prd.md` §12).

- **Global Stylesheet**: `apps/frontend/src/index.css` (contains all design tokens and typography scaling as CSS custom properties in `:root`).
- **Adding New shadcn Components**:
  ```bash
  cd apps/frontend
  npx shadcn@latest add <component-name>
  ```
  *(Example: `npx shadcn@latest add accordion`)*

- **Dev Design System Preview Page**:
  Inspect and verify all installed components and accessibility scaling modes at:
  👉 **`http://localhost:5173/dev/ui-preview`**

---

## 🛠️ Prerequisites

- **Node.js**: `v20.x LTS` or higher
- **pnpm**: `v9.x` or `v10.x` (`npm install -g pnpm`)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/bharatassist`) or MongoDB Atlas cluster URI
- **Gemini API Key**: (Optional for AI assistant features)

---

## 📦 First-Time Setup Instructions

1. **Install Dependencies Across Workspace**:
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in root, `apps/backend`, and `apps/frontend`:
   ```bash
   cp .env.example .env
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```

3. **Seed Database with Real Government Schemes**:
   Populate MongoDB with real schemes (Karnataka Vidyasiri Scholarship, PM-KISAN, PM MUDRA Yojana, IGNOAPS) and a test user with a citizen profile:
   ```bash
   pnpm seed
   ```

---

## 🏃 Running the Application

- **Start Both Frontend and Backend in Parallel**:
  ```bash
  pnpm dev
  ```
  - Frontend: `http://localhost:5173`
  - UI Preview Page: `http://localhost:5173/dev/ui-preview`
  - Backend API: `http://localhost:5000/api`
  - Health Check: `http://localhost:5000/api/health`

- **Build Workspace Applications**:
  ```bash
  pnpm build
  ```

- **Run Linting, Type Checks, and Tests**:
  ```bash
  pnpm lint
  ```
  ```bash
  pnpm typecheck
  ```
  ```bash
  pnpm test
  ```

---

## ☁️ Deployment & Branch Protection

- **Branch Protection**: `main` requires GitHub Actions CI (`.github/workflows/ci.yml`) to pass plus 1 code review before merge.
- **Frontend Hosting**: Auto-deploys to Vercel from `main`. Real secrets are managed via Vercel dashboard.
- **Backend Hosting**: Auto-deploys to Render from `main`. Real secrets are managed via Render dashboard.

---

## 📚 Development Guidelines

For team workflow, folder ownership, commit conventions, and definition of done, please refer to [docs/development.md](file:///Users/varunyr/BharatAI%20Assist%20/docs/development.md).
