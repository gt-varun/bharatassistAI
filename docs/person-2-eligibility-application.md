# Person 2 — Eligibility & Application Journey

**Modules owned:** Eligibility Checker, Application Guidance, Personalized Document Checklist, Compare Schemes
**Reference:** `prd.md` §11.7, §11.8, §11.11, §11.12, §17.2, §17.5

---

## 1. Scope Summary
You own the most logic-heavy slice: turning a scheme's actual legal eligibility rules into a plain-language question flow, generating an accurate personalized document checklist, and walking the citizen through the real application form fields before they leave for the official portal. Build and test your rule engine against real scheme records from Person 1's `schemes` collection, not synthetic rule sets — the rule engine is only as trustworthy as the real eligibility data it evaluates.

---

## 2. Frontend

### 2.1 Eligibility Checker
- One question at a time, plain language, inline "what does this mean?" helper.
- Pre-fills from citizen profile (Person 4's API) so users aren't re-asked known answers.
- Result screen: Eligible / Partially Eligible / Not Eligible with reasons, missing requirements, and real alternative-scheme suggestions.

### 2.2 Personalized Document Checklist
- Required (have/pending) vs Missing (with how-to-obtain guidance) columns.
- Persists per user per scheme; editable; exportable to PDF.

### 2.3 Compare Schemes
- 2–4 scheme side-by-side table (benefit, eligibility snapshot, documents, complexity, processing time, deadline), fed from Person 1's Scheme Details "Add to comparison" action.
- Auto-highlighted differences.

### 2.4 Application Guidance
- Field-by-field walkthrough of the real official application form (explanation only, no submission).
- Document explanations reused from the Checklist component.
- Common-mistakes list and inline terminology glossary, localized.
- Final "Ready to Apply" screen with a validated redirect to the actual official government portal URL.

---

## 3. Backend

### 3.1 API Endpoints (`eligibility/`, `checklist/`, `guidance/`, `compare/`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/eligibility/:schemeId/questions` | GET | Scheme-specific question flow, pre-filled from profile |
| `/api/eligibility/:schemeId/evaluate` | POST | Deterministic rule evaluation → status, reasons, missing requirements, alternatives |
| `/api/checklist/:schemeId` | GET | Returns/generates the personalized checklist |
| `/api/checklist/:schemeId` | PATCH | Update item status |
| `/api/guidance/:schemeId` | GET | Application field walkthrough + common mistakes + glossary |
| `/api/compare` | POST | Accepts scheme IDs, returns normalized comparison data |

### 3.2 Rule Engine
- Fully deterministic — plain rule evaluation against `schemes.eligibilityRules`, never delegated to the AI Assistant.
- Support the generic `{ field, operator, value }` shape in `additionalConditions` so new real scheme rules don't force schema migrations.
- Alternative-scheme logic: on a failed criterion (e.g., income too high), query real schemes with a wider bound on that specific criterion.

---

## 4. Database

### Collections you own:
- **`eligibilityResults`** (full schema: `scheme-database.md` §5) — `status`, `reasons`, `missingRequirements`, `alternativeSchemeIds` per user/scheme.
- **`documentChecklists`** (full schema: `scheme-database.md` §6) — `items: [{ label, status, howToObtain }]` per user/scheme.

### Fields you own on the shared `schemes` collection:
- `eligibilityRules`, `requiredDocuments`, `applicationFields`, `commonMistakes` — populate these against real scheme notifications, cross-checked with Person 1 since both of you read/write the same `schemes` document.

### Indexes
- `{ userId: 1, schemeId: 1 }` unique on both `eligibilityResults` and `documentChecklists`.

---

## 5. Workflow
- Feature branches, PR into `main`, reviewed by at least one other person — the rule engine especially deserves a careful review given its accuracy directly affects real citizens' decisions.
- Unit-test the rule engine against real seeded scheme records with known expected eligibility outcomes before merging.

## 6. Definition of Done
- Eligibility evaluation deterministic and unit-tested against real scheme data with verified expected outcomes.
- Checklist correctly reflects real profile + scheme combinations, persists across sessions.
- Application Guidance always ends at an external redirect clearly marked as leaving the platform — no submission ever handled internally.
- English + Hindi coverage at minimum; WCAG 2.1 AA basics met.
