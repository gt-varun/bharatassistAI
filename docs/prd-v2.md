# BharatAssist AI — Product Requirements Document (PRD) v2

**Tagline:** Making Government Benefits Accessible to Every Citizen.
**Document type:** Production PRD (implementation-ready) — Version 2 (remaining-work + conversational onboarding addendum)
**Status:** v2.0 — supersedes the "Future/V2 Scope" sections of `prd.md` v1 with concrete, implementation-ready requirements
**Owner:** Product
**Source:** Consolidated from `BharatAssist_AI_PRD_Source.pdf` (remaining-tasks breakdown + conversational-onboarding UX spec)

---

## 0. Relationship to v1

`prd.md` (v1) defines the full 14-module product, personas, IA, and workflows. This document does **not** replace it — it is the "what's left, and how the AI-assisted onboarding flow specifically should behave" addendum, written once the team was mid-build. Where this doc's requirements are more specific than v1 (e.g. profile setup, voice), **this document wins**. Where v1 already covers something in full (personas, competitive analysis, tech stack), it isn't repeated here.

Per-person breakdowns of this document live alongside the original per-person docs:
- [`person-1-discovery-content-v2.md`](./person-1-discovery-content-v2.md)
- [`person-2-eligibility-application-v2.md`](./person-2-eligibility-application-v2.md)
- [`person-3-ai-recommendations-v2.md`](./person-3-ai-recommendations-v2.md)
- [`person-4-identity-platform-v2.md`](./person-4-identity-platform-v2.md)

The core message across all four: **this phase is integration and completion, not redesigning or rebuilding modules that already exist.** Reuse the premium landing page, the existing speech infrastructure, and the existing cron/update pipeline rather than recreating any of them.

---

## 1. Landing Page

- Properly integrate the premium landing page already sitting in the Downloads folder into the BharatAssist AI frontend.
- Reuse the actual existing implementation/assets — do not recreate it.
- Keep BharatAssist branding, routes, and functionality intact.
- Do not redesign any other page as part of this task.

**Owner:** Person 1.

---

## 2. Login + Profile Setup Flow

After login, the citizen must be able to set up their profile in **two** ways — the system must never guess which one they want:

### Option A — AI-Assisted Setup
- User chooses "Let BharatAssist AI help me."
- AI asks simple questions conversationally; user can type or speak.
- AI also speaks the questions/responses so the user can listen.
- At the end, AI shows a summary of the information it understood.
- User confirms or edits it.
- Only then is the profile saved.

### Option B — Manual Setup
- User chooses "I'll fill it myself."
- Standard profile form/wizard; user enters/edits everything manually.

### Also required
- A "Skip for now" option.
- The two setup methods must be presented as clearly distinct, equally visible choices — the system must never try to infer which one the user wants.

**Owners:** Person 4 (form/profile plumbing, save/skip), Person 3 (AI-assisted conversational path), jointly.

---

## 3. Voice AI

For AI-assisted onboarding:
- Speech-to-text and text-to-speech.
- Natural speech input; audible AI responses.
- Support for the user's selected language.
- **Reuse the existing speech infrastructure** rather than rebuilding it.

**Owner:** Person 3.

---

## 4. Conversational Onboarding UX Pattern (All Languages)

This is a language-agnostic interaction pattern that must be built **once**, generically, and localized across all 11 supported languages (English, Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Gujarati, Bengali, Punjabi, Urdu) — not reimplemented per language.

### 4.1 Target user assumptions
Design for a citizen who may be any combination of: not comfortable typing, may not read/write well in any language, prefers their regional language over English, uses a basic/entry-level smartphone, and doesn't understand or care what "AI" means. The UX must not depend on the user knowing what "AI" is.

### 4.2 Core design principle
Don't frame the choice as "AI vs Manual." Frame it as an interaction cascade the system moves through automatically depending on the question and the user's response:

```
Voice → AI extraction → Buttons → Text → Human assistance
```

The system dynamically picks the easiest interaction for the situation rather than forcing the user to pick a mode up front:
- Categorical answer (gender, occupation type, yes/no) → large buttons, never typed or spoken.
- Numeric answer (age, income, family size) → voice or a number keypad.
- Open/complex answer (name, free-text detail) → voice primary, typing fallback.
- If the AI detects the user is struggling → proactively offer to switch to large buttons or a human/assisted-help option.
- If the user doesn't understand a question → AI rephrases it more simply in the same language rather than repeating it verbatim.

### 4.3 Entry point: two visible paths, not an implicit guess
After language selection, present two equally clear options rather than defaulting into one:
- "Talk to BharatAssist AI" — answer questions conversationally (voice or text); the system builds the profile from the conversation.
- "I'll fill in the details myself" — the standard manual form/wizard.

This mirrors the Login + Profile Setup requirement in §2 (Option A / Option B) — the same two-path pattern must carry through from language selection into profile setup.

### 4.4 Four input modes (never voice-only)
A rural/public-service product must not be voice-only. Support all four modes, chosen adaptively as above:

| # | Mode | Behavior |
|---|---|---|
| 1 | Voice (primary) | User speaks naturally, in full sentences, in their own phrasing (e.g. an age directly, or a birth year instead). System normalizes either form to the same structured field. |
| 2 | Text (secondary) | For users comfortable typing. Keyboard must support the selected language's script. |
| 3 | Simple choices (buttons/icons) | Preferred whenever the answer is categorical — small icon-button set instead of free text or a dropdown. Default wherever the field has a fixed small set of valid values. |
| 4 | Assisted mode | A visible "Need help?" option connecting the user to a nearby BharatAssist help point — Common Service Centre (CSC) operators, village volunteers, NGOs, government service centres, or a family member — for cases where no self-service mode works. |

### 4.5 Discoverability without teaching "AI"
Don't teach the concept of "AI" — teach the action. UI copy must tell the user exactly what to do (e.g. "Tap here and speak your answer"), not brand the feature as an AI capability. Avoid AI-forward labels like "AI Profile Generator"; prefer action-oriented labels like "Register by speaking" or "Register with BharatAssist's help." A short animated cue (mic icon → speaking indicator → checkmark/recorded confirmation) makes the voice option self-discoverable without explanation text.

### 4.6 Mandatory confirmation before saving anything extracted
Voice/AI extraction must never silently modify or save profile data. Every extracted value goes through an explicit confirm-or-correct step before it's persisted — e.g. "We understood your annual income as ₹1,20,000 — is that correct?" with a clear Yes / No-Change choice. Required because speech recognition is error-prone (background noise, accents, dialects, pronunciation, poor microphones, network issues).

### 4.7 Adaptive questioning — don't ask every field
Don't run a fixed 30-question form. Use what's already known (e.g. state, occupation) to narrow down potentially relevant schemes first, derive the eligibility fields those schemes actually require, and only ask the questions still missing:

```
Profile so far → candidate schemes → required eligibility fields → ask only the missing ones
```

This also applies within a single field: derive one field from another instead of always asking directly (e.g. approximate age from a stated birth year). If the user doesn't know an answer, offer an easier alternative version of the same question (e.g. birth year instead of exact age) rather than getting stuck.

### 4.8 Reframing the feature internally
Internally this is not "a chatbot bolted onto a form" — it's conversational form-filling: AI converts natural, unstructured conversation into structured profile data, field by field, with confirmation at each step. The building blocks are the same regardless of language: a conversation state machine, a shared profile schema, per-field validation, multilingual speech-to-text/text-to-speech, and the scheme eligibility engine consuming the resulting profile.

### 4.9 Generalized architecture

```
BharatAssist AI → Language Selection (any of 11 supported languages)
   ├─ "Fill Yourself" → Text / Buttons
   └─ "Talk to BharatAssist AI" → Voice (+ Text fallback)
        → Speech-to-Text (selected language)
        → Language Understanding / AI Extraction
        → Confirmation (Yes / No, Change)
        → Profile Data Store
             → Scheme Engine: Missing Data → Ask next missing question
             → Scheme Engine: Eligibility → Results
```

This flow must be built once as a shared, language-parameterized module — not reimplemented per language. Localization work (§8 below) plugs into this same state machine for all 11 languages.

**Owner:** Person 3 (conversation engine, extraction, confirmation logic), with Person 4 (profile schema/save) and Person 1 (entry-point UI mirroring landing) as consumers of the shared state machine.

---

## 5. State / Address Decision

The system must **not** assume the user's current state from their Aadhaar address. During profile setup, explicitly ask which state the user currently lives in. State is the primary location signal used for scheme discovery/recommendations. Aadhaar/address proof must **not** automatically determine the user's current state. If a particular scheme requires domicile/residency proof, that is handled separately inside the eligibility flow.

> Current residence ≠ Aadhaar address ≠ domicile, automatically.

**Owner:** Person 4 (profile field + save logic), consumed by Person 1 (discovery) and Person 2 (eligibility/domicile handling).

---

## 6. Scheme Database + Real Data

The schemes collection must contain real, verified government schemes, not placeholder/demo data. Each scheme record requires: scheme name, department/ministry, central/state, state, description, benefits, eligibility rules, required documents, application fields, application mode, official portal, deadline/status, source reference, last-verified date, translations.

**Owners:** Person 1 and Person 2, jointly — coordinate explicitly on the shared eligibility-rules/required-documents fields since both read/write the same `schemes` document.

---

## 7. Scheme Update System / Cron Job

The cron/update pipeline already exists — no new scheduler needs to be built. What remains:
- Expand official government source coverage (more central sources, more state-level sources; strong Karnataka coverage first, then expand).
- Detect new schemes, changed benefits, changed eligibility, changed deadlines.
- Extract updated information; validate before publishing.
- Update the schemes collection; regenerate embeddings when content changes; refresh search/index data.
- Log every update; route low-confidence extractions to review instead of blind-publishing.
- Configure production secrets/credentials; test the complete update pipeline end to end.

> The database must remain the single source of truth.

**Owner:** Person 3 (already implemented; this phase is source-coverage expansion + production hardening).

---

## 8. All 11 Languages

Complete and verify full UI coverage for: English, Hindi, Kannada, Tamil, Malayalam, Marathi, Gujarati, Telugu, Bengali, Punjabi, Urdu (RTL).

Coverage must include: navigation, buttons, search, login, profile, dashboard, eligibility, checklist, application guidance, AI Assistant, errors, empty states, notifications, onboarding.

- Urdu must support RTL.
- A language must only appear in the language selector once its UI translation coverage is complete — no partial-translation languages exposed.

**Owner:** Person 4 (i18n mechanism, selector gating), all four persons for their own module's string coverage.

---

## 9. AI Assistant Integration

Verify the complete grounded AI flow end to end:

```
User → Intent → Scheme Retrieval → Relevant Schemes → Gemini → Grounded Answer → Source References
```

Test coverage required: scheme questions, eligibility questions, document questions, benefit questions, no-result questions, wrong/unknown scheme queries, multilingual queries, scheme-specific explanations, voice interaction.

> The AI must never invent scheme names, eligibility rules, documents, deadlines, or benefit amounts. If retrieval finds nothing, it must clearly say it couldn't find a matching verified scheme instead of guessing.

**Owner:** Person 3.

---

## 10. Dashboard Integration

Ensure the dashboard works with real data end to end:

```
Login → Profile → Recommendations → Dashboard
```

Dashboard must correctly show: recommended schemes, why a scheme was recommended, saved schemes, recently viewed, deadlines, eligibility status, AI Assistant access, profile completion.

**Owner:** Person 3 (recommendations feed), Person 4 (profile completion, saved schemes) — jointly, cross-module integration.

---

## 11. Eligibility Integration

Verify:

```
Scheme → Eligibility Questions → Profile Prefill → User Answers → Deterministic Rule Engine → Result
```

Result must be Eligible / Partially Eligible / Not Eligible, with: reasons, failed criteria, missing requirements, alternative schemes where applicable.

> Eligibility must be deterministic and must NOT be calculated by Gemini.

**Owner:** Person 2.

---

## 12. Document Checklist

Verify:

```
Scheme + Profile + Eligibility Result → Personalized Checklist
```

Checklist must show: required documents, Have/Pending status, missing documents, how to obtain missing documents, persistence per user per scheme, export/print functionality.

**Owner:** Person 2.

---

## 13. Application Guidance

Verify:

```
Scheme → Application Fields → Document Guidance → Common Mistakes → Ready to Apply → Official Government Portal
```

> BharatAssist must NEVER submit the government application. The final step must clearly redirect the citizen to the official government portal.

**Owner:** Person 2.

---

## 14. Complete User Journeys

**Guest flow:**
```
Landing → Search/Browse → Scheme Details → Eligibility → Result → Login → Profile → Checklist → Application Guidance → Official Portal
```

**Registered user flow:**
```
Login → Profile → Dashboard → Recommendation → Scheme → Eligibility → Checklist → Application Guidance → Official Portal
```

The AI Assistant must be accessible throughout the journey, in both flows.

**Owner:** Cross-cutting — every person verifies their segment of both journeys end to end.

---

## 15. Final QA

Before calling the project complete, test: frontend build, backend build, TypeScript, lint, unit tests, API integration, authentication, profile, search, categories, scheme details, eligibility, checklist, application guidance, saved schemes, AI Assistant, recommendations, languages, voice, responsive UI, accessibility, security, official portal redirects, cron/update pipeline. Also test Desktop, Tablet, and Mobile.

**Owner:** All four persons, each against their own module list; final pass owned jointly.

---

## 16. Priority Order

### P0 — Do first
1. Login → AI/Manual Profile Setup (Person 4 + Person 3)
2. Voice + Text AI onboarding (Person 3)
3. State/current residence handling (Person 4)
4. Real scheme data verification (Person 1 + Person 2)

### P1
1. Scheme update/cron pipeline + official source expansion (Person 3)
2. Complete 11-language coverage (Person 4 + all)
3. AI Assistant grounding/integration (Person 3)
4. Dashboard + cross-module integration (Person 3 + Person 4)

### P2
1. Full Eligibility → Checklist → Guidance integration (Person 2)
2. Complete Guest + Registered user journeys (all)
3. Full QA/security/accessibility/performance testing (all)

> The focus going forward is integration and completion, not redesigning or rebuilding modules that are already implemented.
