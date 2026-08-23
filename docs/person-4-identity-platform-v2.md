# Person 4 PRD v2 — Identity, Profile & Platform

**Modules owned (unchanged):** Authentication, Citizen Profile, Saved Schemes, Multilingual Support (mechanism)
**Reference:** `prd-v2.md` §2, §5, §8, §10, §14, §15 · original scope: [`person-4-identity-platform.md`](./person-4-identity-platform.md)
**Status:** Remaining-work addendum — integration and completion, not a redesign.

---

## 1. What changed since v1

Auth and core profile already exist. This phase adds: the manual-setup path of the new two-path profile flow, a new explicit "current state" field decoupled from Aadhaar/address, and finishing full 11-language coverage so the language selector can honestly expose all of them.

---

## 2. §2 — Login + Profile Setup: your path (P0)

- Own **Option B — Manual Setup**: "I'll fill it myself" → the existing profile form/wizard, unchanged in substance.
- Own the **"Skip for now"** option across both paths.
- Own the underlying profile save endpoint that both your manual form and Person 3's AI-assisted conversational flow ultimately write to — one shape, one save path, two ways of filling it in. Don't let Person 3's flow fork a parallel profile write path.
- Present both options (AI-assisted vs manual) as equally visible, distinct choices — never default or infer which one the user wants. This mirrors the same two-path pattern Person 1 exposes on the landing page (`prd-v2.md` §4.3); keep the copy/visual treatment consistent between the two entry points.

---

## 3. §5 — State / Address Decision (P0, new field)

- During profile setup, explicitly ask which state the user **currently lives in** — this is a first-class profile field, separate from and never inferred from any Aadhaar/address data.
- This state value is what Person 1 (discovery) and Person 2 (eligibility) use as the primary location signal.
- If a scheme requires domicile/residency proof specifically, that stays out of this general field — Person 2 handles it as a distinct eligibility/document step.

**Acceptance:** `citizenProfiles` has an explicit, user-entered `currentState` field; no code path derives it from an address or Aadhaar value.

---

## 4. §8 — All 11 Languages (mechanism owner)

- Drive full UI string coverage to completion for: English, Hindi, Kannada, Tamil, Malayalam, Marathi, Gujarati, Telugu, Bengali, Punjabi, Urdu (RTL).
- Coverage spans every module: navigation, buttons, search, login, profile, dashboard, eligibility, checklist, application guidance, AI Assistant, errors, empty states, notifications, **onboarding** (new — Person 3's conversational flow copy included).
- Enforce in the selector: a language only appears once its coverage is complete — continue gating partial-translation languages out, per the existing rule.
- Coordinate string collection from each person for their own module (you own the mechanism and gating, not every string).

---

## 5. §10 — Dashboard Integration (joint with Person 3)

```
Login → Profile → Recommendations → Dashboard
```

You own: saved schemes, profile completion indicator. Person 3 owns: recommendations, "why recommended," AI Assistant entry point. Verify jointly against real data.

---

## 6. §14 / §15 — Journeys & Final QA (your scope)

Verify Auth → Profile (both setup paths) → Saved Schemes in both the Guest and Registered journeys; your Final QA scope: authentication, profile, saved schemes, languages, Desktop/Tablet/Mobile, DPDP-compliant data export/deletion still functional after profile-flow changes.

---

## 7. Definition of Done (v2)

- Manual profile setup, Skip, and the shared save endpoint all functional and shared correctly with Person 3's AI-assisted path.
- Explicit `currentState` field live, never inferred from Aadhaar/address, feeding Person 1 and Person 2 correctly.
- All 11 languages reach full UI coverage (including onboarding strings) and the selector correctly gates incomplete ones.
- Saved Schemes and profile completion verified against real dashboard data.
- DPDP export/deletion still correct after the new profile-setup paths are added.
