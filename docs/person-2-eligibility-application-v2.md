# Person 2 PRD v2 — Eligibility & Application Journey

**Modules owned (unchanged):** Eligibility Checker, Application Guidance, Personalized Document Checklist, Compare Schemes
**Reference:** `prd-v2.md` §5, §6, §11, §12, §13, §14, §15 · original scope: [`person-2-eligibility-application.md`](./person-2-eligibility-application.md)
**Status:** Remaining-work addendum — integration and completion, not a redesign.

---

## 1. What changed since v1

This phase is about wiring your already-built rule engine, checklist, and application guidance modules to real profile data (including the new state/residence field) and real scheme records, and verifying the full deterministic chain end to end — not building new UI.

---

## 2. §5 — State / Address Decision (consumed from Person 4)

- Eligibility evaluation must use the citizen's **explicitly-entered current state** (Person 4's profile field), never an inference from Aadhaar/address proof.
- If a scheme's eligibility rules require domicile/residency proof specifically (distinct from current-residence state), that must be handled as its own eligibility question/document inside your rule engine and checklist — do not conflate it with the general state field.

**Acceptance:** No eligibility logic anywhere derives "current state" from an address/Aadhaar field; domicile-specific schemes ask for domicile proof as a distinct, explicit step.

---

## 3. §6 — Scheme Database + Real Data (shared with Person 1)

- You own `eligibilityRules`, `requiredDocuments`, `applicationFields`, `commonMistakes` on the shared `schemes` document — populate/verify these against real scheme notifications, cross-checked with Person 1.
- Unit-test the rule engine against real seeded scheme records with known, verified expected outcomes (not synthetic rule sets) before merging.

---

## 4. §11 — Eligibility Integration (verification pass)

Verify the full chain against real data:

```
Scheme → Eligibility Questions → Profile Prefill → User Answers → Deterministic Rule Engine → Result
```

- Result must be Eligible / Partially Eligible / Not Eligible with reasons, failed criteria, missing requirements, and real alternative-scheme suggestions.
- Reconfirm: eligibility is **never** computed by Gemini/the AI Assistant — deterministic rule evaluation only, per `prd-v2.md` §11.
- Profile prefill must correctly pull from Person 4's `citizenProfiles`, including values that arrived via Person 3's AI-assisted conversational onboarding (§4.9 of `prd-v2.md`) — those are the same profile fields, just filled through a different path, so your prefill logic needs no special-casing per input method.

---

## 5. §12 — Document Checklist (verification pass)

```
Scheme + Profile + Eligibility Result → Personalized Checklist
```

Verify: required documents list, Have/Pending status, missing documents with how-to-obtain guidance, persistence per user per scheme, export/print functionality all work against real scheme + profile combinations.

---

## 6. §13 — Application Guidance (verification pass)

```
Scheme → Application Fields → Document Guidance → Common Mistakes → Ready to Apply → Official Government Portal
```

- Reconfirm the final step **always** redirects to the real official government portal URL — BharatAssist never submits the application itself.
- Validate the redirect URL against an allow-list of official government domains (link-spoofing protection, per `prd.md` v1 §18).

---

## 7. §14 / §15 — Journeys & Final QA (your scope)

Verify Eligibility → Checklist → Application Guidance end to end in both the Guest and Registered user journeys, plus your module list in Final QA: eligibility, checklist, application guidance, official portal redirects, Desktop/Tablet/Mobile, WCAG 2.1 AA basics.

---

## 8. Definition of Done (v2)

- Eligibility evaluation uses the real, explicitly-entered state field — never Aadhaar-address inference — and handles domicile-specific requirements as a separate step.
- Rule engine, checklist, and application guidance all verified against real scheme data with unit-tested, known-correct expected outcomes.
- Full Guest and Registered journeys pass end to end through your slice with real data.
- Application Guidance never submits anything; final redirect always lands on an allow-listed official government portal.
