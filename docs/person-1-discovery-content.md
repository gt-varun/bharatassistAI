# Person 1 — Discovery & Content

**Modules owned:** Landing Page, Smart Scheme Search, Browse Categories, Scheme Details
**Reference:** `prd.md` §11.1, §11.4, §11.5, §11.6, §17.1

---

## 1. Scope Summary
You own the citizen's entry point and the core discovery surfaces: landing, search, browse, and full scheme detail. Your `schemes` collection and retrieval service are shared infrastructure — Person 3's AI Assistant and Recommendation Engine call your retrieval function directly rather than building a second index. Build against real scheme data from day one, not placeholders — pull actual scheme records (see §4) so search relevance, filters, and ranking are validated against real-world messiness (inconsistent formatting, missing fields, regional-language content) rather than clean fixtures.

---

## 2. Frontend

### 2.1 Landing Page
- Hero with value proposition + primary CTA ("Find schemes for me").
- Language selector (global component, shared across all four slices).
- Three quick-entry paths: keyword search bar, "Browse by category," "Answer 3 questions" mini-funnel (hands off into Person 2's Eligibility Checker).
- Segment shortcut tiles (Students, Farmers, Women, Senior Citizens, Entrepreneurs, MSMEs, PwD, Job Seekers).
- Trust strip: data-source disclosure + last-updated indicator, pulled from real `lastVerifiedAt` values.

### 2.2 Smart Scheme Search
- Typo-tolerant, natural-language search bar.
- Filters: state/central, category, target segment, income band, benefit type, department, deadline status.
- Results list: card per scheme (name, short description, matched-criteria tags, save action wired to Person 4's saved-schemes API).
- Empty-state handling when no results match a query.

### 2.3 Browse Categories
- Category grid (segment, benefit type, state) with live scheme counts.
- Category → filtered scheme list (reuses the Search results component).

### 2.4 Scheme Details
- Full record view: name, department, description, benefits, plain-language eligibility summary, required documents, application mode, official portal link, last-verified date, source reference.
- CTAs: "Check my eligibility" (Person 2), "Save scheme" (Person 4), "Add to comparison" (Person 2), "Explain this simpler" (Person 3, scoped to this scheme only).
- Tabbed sub-navigation: Overview / Eligibility / Documents / How to Apply — you build the shell, Person 2 populates Eligibility/Documents/How-to-Apply content.

---

## 3. Backend

### 3.1 API Endpoints (`schemes/`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/schemes/search` | GET | Keyword + filter + natural-language search |
| `/api/schemes/categories` | GET | Category list with live counts |
| `/api/schemes/categories/:slug` | GET | Schemes within a category |
| `/api/schemes/:slug` | GET | Full scheme detail record |
| `/api/schemes` | GET | Paginated listing (also used by the Knowledge Update System) |

### 3.2 Search Implementation
- Hybrid retrieval: MongoDB text index (keyword/filter) + Atlas Vector Search (semantic, natural-language queries).
- Query understanding: extract structured filters from free text before retrieval.
- Ranking boosted by citizen profile match when authenticated (reads Person 4's `citizenProfiles`).
- Export the retrieval logic as a reusable service function — this is the single retrieval path the whole platform uses, including the AI Assistant.

---

## 4. Database

### `schemes` — your primary collection, real data only.
Full field list, index requirements, and a full sample document are in `scheme-database.md` §2 and §10. You own: `name`, `slug`, `department`, `level`, `state`, `shortDescription`, `fullDescription`, `targetSegments`, `benefitType`, `benefitSummary`, `applicationMode`, `officialPortalUrl`, `status`, `deadline`, `lastVerifiedAt`, `sourceRef`, `translations`.

You read (owned jointly with Person 2, single source of truth): `eligibilityRules`, `requiredDocuments`, `applicationFields`, `commonMistakes`.

### Indexes
- Text index on `name`, `shortDescription`, `fullDescription`.
- `{ targetSegments: 1, state: 1, status: 1 }` compound index.
- `{ slug: 1 }` unique.
- Vector index for semantic search on the embeddings companion collection.

### Real data sourcing
Populate `schemes` with actual government notifications (central + at least a few state schemes across the target segments) rather than fabricated placeholders — accuracy of `eligibilityRules` and `requiredDocuments` against the real notification is what makes Person 2's rule engine trustworthy downstream.

---

## 5. Workflow
- Work directly off `main`, feature branches per increment (`feature/search-natural-language`, etc.), PR into `main` with review from at least one other person before merge — no long-lived side branches.
- Flag any change to the `Scheme` shared type in the PR description; it's read by Person 2 and Person 3.

## 6. Definition of Done
- Search returns relevant, ranked results for keyword and natural-language queries within <1.5s p95 against real scheme data.
- Category browsing and Scheme Details fully functional in English + Hindi at minimum.
- Retrieval service is a shared, reusable function, not embedded in a route handler.
- WCAG 2.1 AA basics met.
