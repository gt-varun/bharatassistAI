# BharatAssist AI — Product Requirements Document (PRD)

**Tagline:** Making Government Benefits Accessible to Every Citizen.
**Document type:** Production PRD (implementation-ready)
**Status:** v1.0 — Draft for engineering kickoff
**Owner:** Product

---

## 1. Executive Summary

BharatAssist AI is an AI-assisted discovery and guidance platform that helps Indian citizens find government schemes they qualify for, understand what those schemes require, and prepare a complete, correct application before being handed off to the relevant official government portal for final submission.

The platform is not a chatbot with a scheme list attached — it is a structured discovery and guidance system (search, filters, eligibility engine, comparison, document checklists, application walkthroughs) in which an AI assistant is one access layer among several, always grounded in a verified scheme database rather than free-form generation.

The system deliberately stops short of accepting or submitting applications. Government portals remain the system of record for submission; BharatAssist AI's job ends at "the citizen is ready and knows exactly what to do next."

---

## 2. Vision

A country where no citizen loses out on a benefit they are entitled to simply because they didn't know it existed, couldn't understand the eligibility criteria, or didn't know how to fill the form.

## 3. Mission

Build a trustworthy, multilingual, AI-augmented assistant that turns scattered, jargon-heavy government scheme information into a guided, personalized, step-by-step journey — from discovery to application-ready — for every citizen segment, including those with low digital literacy.

---

## 4. Problem Statement

- Scheme information is fragmented across hundreds of central, state, and department websites, each with different formats and terminology.
- Eligibility criteria are written in legal/bureaucratic language that is hard to self-assess against.
- Citizens frequently don't know which documents they need until they've already started (and stalled) an application.
- Application forms use government-specific terms (e.g., "domicile certificate," "income certificate," "caste certificate," "EWS certificate") that are unfamiliar to first-time applicants.
- Language is a real barrier — most scheme portals are English/Hindi-only, excluding large regional-language-first populations.
- Awareness is the single biggest driver of missed benefits — citizens simply don't know a scheme exists for their situation (student, farmer, women-led MSME, PwD, senior citizen, job seeker, etc.).

## 5. Objectives

1. Let a citizen discover every scheme they're plausibly eligible for in under 2 minutes, without knowing scheme names in advance.
2. Convert legalistic eligibility criteria into a plain-language, answerable checklist with a clear Eligible / Partially Eligible / Not Eligible outcome and reasons.
3. Generate a personalized, accurate document checklist per scheme per citizen profile.
4. Walk a citizen through every field and document of an application before they reach the official portal, reducing rejection due to preventable errors.
5. Serve citizens in their language of comfort across 11 Indian languages.
6. Keep the scheme knowledge base current without manual re-entry, via a background monitoring/update service.
7. Never let the AI assistant become a source of unverified information — all AI output is grounded in the retrieved scheme database.

## 6. Non-Goals (Explicit Product Decisions)

- **Not** an application submission portal. No form submission to government systems happens inside BharatAssist AI.
- **Not** a document storage vault for legally sensitive originals (only checklist tracking, not certified document hosting).
- **Not** a general-purpose government chatbot — the AI is scoped strictly to scheme discovery, explanation, and guidance.
- **Not** an admin CMS in v1 — the knowledge base is updated by an automated background service, not manual data entry screens (see §17).

---

## 7. Target Audience & Personas

**Segments:** Students, Farmers, Women, Senior Citizens, Entrepreneurs, MSMEs, Persons with Disabilities, General Citizens, Job Seekers.

| Persona | Profile | Core Need | Primary Barrier |
|---|---|---|---|
| Anitha, 20, Engineering Student (Kannada-first) | First-gen college student, family income near cutoff | Scholarship discovery + eligibility clarity | Doesn't know scholarship categories/terms |
| Ramesh, 47, Farmer (Telugu-first) | Owns 2 acres, low digital literacy | Subsidy/insurance schemes, simple language | Reading dense English notifications |
| Fatima, 34, Home-based entrepreneur | Wants MSME/women-entrepreneur loans | Eligibility + required documents | Doesn't know women-specific schemes exist |
| Suresh, 68, Senior Citizen (Tamil-first) | Pension and healthcare schemes | Step-by-step guidance, large-print-friendly UI | Complex forms, no one to ask |
| Priya, 29, PwD job seeker | Disability certificate holder | Reservation/job schemes + document prep | Fragmented disability-specific info |

## 8. Competitive Analysis

| Platform | Strength | Gap BharatAssist AI Fills |
|---|---|---|
| MyScheme (Govt. of India) | Authoritative, central source | No AI guidance, limited personalized document checklist, no application field-level walkthrough |
| UMANG App | Multi-service govt access | Broad but shallow; not scheme-discovery-first, weak eligibility explanation |
| State-specific portals | Deep local coverage | Siloed per state, no cross-state discovery, no unified UX |
| Generic AI chatbots (ChatGPT etc.) | Flexible Q&A | No verified data grounding, risk of hallucinated eligibility/documents, no application guidance workflow |

**Differentiation:** structured eligibility engine + personalized checklist + field-level application guidance + multilingual UX + AI grounded strictly in verified data, not general knowledge.

---

## 9. AI Philosophy

- The **database is the source of truth**, not the model.
- The AI assistant only: understands natural language queries, retrieves relevant scheme records, explains/summarizes/translates retrieved content, recommends and compares based on retrieved data, and guides users through pre-defined application steps.
- The AI **never invents** scheme names, eligibility rules, documents, deadlines, or benefit amounts. If retrieval returns nothing relevant, the assistant says so and offers to broaden the search — it does not fill the gap with generated content.
- Every AI response that states a fact (eligibility rule, document, deadline, benefit) must be traceable to a specific scheme record returned by retrieval.

---

## 10. Complete Feature List (14 Modules)

1. Landing Page
2. Authentication
3. Citizen Profile
4. Smart Scheme Search
5. Browse Categories
6. Scheme Details
7. Eligibility Checker
8. Compare Schemes
9. Saved Schemes
10. AI Assistant
11. Application Guidance
12. Personalized Document Checklist
13. Multilingual Support
14. Recommendation Engine

Plus one internal, non-UI module:
15. Knowledge Update System (background service, no admin UI in v1)

---

## 11. Functional Requirements by Module

### 11.1 Landing Page
- Hero with plain-language value proposition and a single primary CTA ("Find schemes for me").
- Language selector visible above the fold (persists across session).
- Quick-entry paths: "Search by keyword," "Browse by category," "Answer 3 questions to get matches" (mini eligibility funnel), "Ask the AI Assistant."
- Trust signals: data-source disclosure ("Scheme data sourced from official government notifications"), last-updated indicator.
- Category shortcuts by target segment (Students, Farmers, Women, Senior Citizens, etc.).
- Fully usable without login (guest browsing).

### 11.2 Authentication
- Sign up / login via mobile number + OTP (primary, given target demographic) and email + password (secondary).
- JWT-based session with refresh token rotation.
- Guest mode: full browsing and eligibility checking without an account; account required only to save schemes, get personalized checklists tied to a saved profile, or use application guidance persistently across sessions.
- Password reset, OTP resend with rate limiting.
- Account deletion / data export (DPDP Act compliance, see §16).

### 11.3 Citizen Profile
- Structured profile fields: state, district, age, gender, occupation category, annual income band, education level, category (General/OBC/SC/ST/EWS — optional, user-controlled), disability status (optional), marital status (optional), land ownership (for farmer schemes), business type (for MSME schemes).
- Every profile field is optional except state — the platform must remain useful with a minimal profile, with progressively better matching as more fields are filled.
- Profile completeness indicator to nudge better recommendations, never a hard gate.
- Profile data feeds Eligibility Checker, Recommendation Engine, and Document Checklist.

### 11.4 Smart Scheme Search
- Keyword search across scheme name, description, benefits, and tags.
- Natural language search ("schemes for a woman starting a small business in Karnataka") resolved via query understanding into structured filters + semantic retrieval.
- Typo tolerance and synonym handling (e.g., "loan" ≈ "credit scheme," "scholarship" ≈ "fee waiver").
- Filters: state/central, category, target segment, income band, benefit type (cash/loan/subsidy/certificate/service), department, application deadline status (open/rolling/closed).
- Search results ranked by relevance to profile if logged in, otherwise by generic relevance + popularity.

### 11.5 Browse Categories
- Curated category grid: by segment (Students, Farmers, Women, Senior Citizens, PwD, Entrepreneurs/MSME, Job Seekers, General), by benefit type, and by state.
- Each category shows scheme count and a short description of who it's for.

### 11.6 Scheme Details
- Canonical scheme record view: name, issuing department/ministry, short and full description, benefits, eligibility summary (plain language, derived from structured rules), required documents, application mode (online/offline/both), official portal link, deadline/validity, last-verified date, source notification reference.
- "Check my eligibility" and "Save scheme" CTAs inline.
- "Explain this in simpler terms" AI action scoped to this scheme's data only.

### 11.7 Eligibility Checker
- Short, plain-language question flow generated from the scheme's structured eligibility rules (not a generic form — questions are scheme-specific and skip anything already known from the citizen profile).
- Output: **Eligible / Partially Eligible / Not Eligible**, with:
  - Reasons for the determination, referencing the specific criteria that passed/failed.
  - Missing requirements if partially eligible (e.g., "You need an income certificate dated within the last 6 months").
  - Alternative scheme suggestions if not eligible, based on why they failed (e.g., income too high → suggest a scheme with a higher income cap).
  - Required documents list, pre-filled into the Document Checklist if the user proceeds.
- Deterministic rule evaluation in the backend — the AI assistant may explain the result but never computes eligibility itself.

### 11.8 Compare Schemes
- Select 2–4 schemes for side-by-side comparison: benefit amount/type, eligibility snapshot, documents required, application complexity (low/medium/high, derived from field count + document count), processing time (if known), deadline.
- Highlight differences automatically (e.g., "Scheme A has a higher income cap").

### 11.9 Saved Schemes
- Bookmark schemes for logged-in users; organized by status: Saved, Eligibility Checked, Application In Progress, Applied (self-reported, informational only — not tracked with government systems).
- Reminders for approaching deadlines on saved schemes (notification module dependency).

### 11.10 AI Assistant
- Conversational interface available as a persistent widget and a dedicated full page.
- Scope: recommend schemes, explain eligibility/benefits/terminology, compare schemes, summarize official notifications, answer FAQs, multilingual response in the user's selected language, and hand off into Application Guidance for a specific scheme.
- Every substantive answer is grounded via retrieval against the scheme database (RAG pattern); the assistant discloses when it cannot find a matching scheme rather than guessing.
- Conversation history persisted per logged-in user for continuity; guest sessions are ephemeral.

### 11.11 Application Guidance
- Triggered after a user selects a scheme to proceed with.
- Step-by-step walkthrough of the **official application**, not a form BharatAssist AI submits:
  - Field-by-field explanation of what the official form will ask and what to enter.
  - Explanation of every required document and where to obtain it (e.g., "Income certificate — apply at your Taluk office or via [state e-portal]").
  - Common mistakes for this specific scheme (e.g., "Name must exactly match Aadhaar spelling").
  - Government terminology glossary inline, in the user's language.
- Ends with a "Ready to Apply" screen that redirects to the official government portal URL, with the personalized checklist available to reference alongside.

### 11.12 Personalized Document Checklist
- Generated from: selected scheme + profile fields (state, occupation, income, education, gender, category).
- Two-state checklist: **Required** (✓ have / pending) and **Missing** (❌ not yet obtained, with guidance on how to obtain).
- Persists per user per scheme; updatable as profile changes.
- Exportable/printable (PDF) for offline use — relevant for low-connectivity users.

### 11.13 Multilingual Support
- Languages: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Gujarati, Bengali, Punjabi, Urdu.
- Full UI localization (not just scheme content) — navigation, buttons, error messages, eligibility question flow, AI assistant responses.
- Scheme content translation pipeline: canonical record stored once (typically English + Hindi from source), on-demand/AI-assisted translation to other languages with human-verifiable flagging for high-stakes fields (eligibility criteria, benefit amounts) — machine translation alone is not trusted for numeric/legal fields without a verification flag.
- RTL layout support for Urdu.

### 11.14 Recommendation Engine
- Two modes:
  - **Profile-based:** ranks all schemes against a logged-in user's profile using rule-based matching (hard filters: state, category eligibility bounds) plus relevance scoring (soft signals: segment tags, popularity, recency).
  - **Contextual:** "More like this" from a scheme detail page, and "Because you're eligible for X, you may also qualify for Y" cross-recommendations.
- Recommendations always show *why* a scheme was recommended (matched criteria), building trust and enabling the user to self-correct their profile if a match seems wrong.

### 11.15 Knowledge Update System (background service, conceptual — see §17)

---

## 12. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Search results < 1.5s p95; eligibility check < 2s p95; AI assistant first-token < 2s |
| Scalability | Support burst traffic around scheme deadline announcements (design for 10x baseline spikes) |
| Availability | 99.5% uptime target for citizen-facing services |
| Accessibility | WCAG 2.1 AA minimum; large-text mode for senior citizens; screen-reader compatible flows |
| Data accuracy | Every scheme record must carry a "last verified" timestamp and source reference; stale (>90 days unverified) records flagged in UI |
| Security | JWT with short-lived access tokens + rotating refresh tokens; OTP rate limiting; input sanitization against injection; encrypted storage of PII |
| Privacy | Compliance with India's Digital Personal Data Protection (DPDP) Act — explicit consent for profile data use, data export, and deletion rights |
| Offline resilience | Document checklist and scheme details cached/exportable for low-connectivity users |
| Localization | All 11 languages must reach full UI string coverage before a language is exposed as selectable, not partial translation |
| Auditability | Every AI assistant response that states a fact must log the retrieved source record IDs for traceability |

---

## 13. Representative User Stories & Acceptance Criteria

**US-1 (Search):** As a citizen, I want to search in plain language so I don't need to know scheme names.
- AC: Query "loan for women starting business Karnataka" returns state-appropriate, women-entrepreneur-tagged schemes ranked above generic MSME schemes.

**US-2 (Eligibility):** As a farmer with a 6th-grade reading level, I want simple yes/no questions instead of legal text.
- AC: Eligibility questions use everyday vocabulary; each question has an inline "what does this mean?" helper; result screen shows Eligible/Partially/Not with plain-language reasons.

**US-3 (Document Checklist):** As a student, I want to know exactly what's missing before I go to a government office.
- AC: Checklist splits Required vs Missing; each Missing item links to where/how to obtain it.

**US-4 (AI grounding):** As a citizen, I don't want the AI to make up information.
- AC: If no matching scheme is retrieved, the assistant explicitly states it found no matching scheme and offers to broaden criteria, rather than generating a plausible-sounding answer.

**US-5 (Application guidance):** As a first-time applicant, I want help understanding the form before I open the government website.
- AC: Guidance screen lists every field the official form will ask, in the user's language, before the redirect link is shown.

**US-6 (Multilingual):** As a Tamil-speaking senior citizen, I want the entire experience in Tamil, not just scheme summaries.
- AC: Navigation, buttons, eligibility questions, and checklist labels are all in Tamil when Tamil is selected — no mixed-language screens.

---

## 14. Information Architecture

```
Home
├── Search
│   ├── Search Results
│   └── Scheme Detail
│       ├── Eligibility Checker
│       ├── Document Checklist
│       ├── Application Guidance
│       └── Compare (add to comparison tray)
├── Browse Categories
│   └── Category → Scheme List → Scheme Detail
├── AI Assistant (persistent widget + full page)
├── Compare Schemes
├── Saved Schemes (auth required)
├── Profile (auth required)
│   ├── Personal Details
│   ├── Saved Schemes
│   ├── Application Progress
│   └── Settings (language, notifications, data export/delete)
└── Auth (Login / Signup / OTP)
```

## 15. Navigation Structure

- Persistent top bar: Logo, Search bar, Language selector, AI Assistant icon, Profile/Login.
- Bottom nav (mobile): Home, Search, AI Assistant, Saved, Profile.
- Scheme Detail sub-navigation (tabs): Overview, Eligibility, Documents, How to Apply.

---

## 16. User Journeys

### 16.1 Guest User Journey
Land → select language → browse category or search → view scheme detail → run eligibility checker (no login required, session-scoped) → prompted to sign up only when trying to save the scheme or persist the document checklist → sign up (OTP) → profile pre-filled from eligibility answers → checklist generated → application guidance → redirect to official portal.

### 16.2 Registered User Journey
Login → dashboard shows profile-matched recommendations with "why recommended" → user reviews saved schemes and deadlines → opens a recommended scheme → eligibility auto-evaluated from stored profile (no re-asking known answers) → document checklist auto-generated → application guidance → mark as "Applied" (self-reported) → AI assistant available throughout for clarifying questions.

---

## 17. Key Workflows

### 17.1 Search Workflow
1. User enters keyword or natural-language query.
2. Query understanding layer extracts structured filters (state, segment, benefit type) + generates a semantic embedding.
3. Hybrid retrieval: keyword/filter match (exact) + vector similarity (semantic) against the scheme knowledge base.
4. Results merged, deduplicated, ranked (profile relevance if logged in).
5. Results rendered with match explanation.

### 17.2 Eligibility Workflow
1. User selects a scheme.
2. Backend loads the scheme's structured eligibility rule set.
3. System pre-fills any answers already known from the citizen profile.
4. Remaining questions presented one at a time in plain language.
5. Rule engine deterministically evaluates: Eligible / Partially Eligible / Not Eligible.
6. Reasons, missing requirements, and alternative scheme suggestions computed and returned.
7. Result and required documents feed directly into the Document Checklist module.

### 17.3 Recommendation Workflow
1. Triggered on login/dashboard load or profile update.
2. Hard filters applied first (state, category, statutory eligibility bounds) to exclude impossible matches.
3. Remaining candidates scored on relevance (segment tags, income band fit, recency, popularity).
4. Top-N returned with matched-criteria explanation per scheme.

### 17.4 AI Assistant Workflow
1. User sends a natural-language message.
2. Intent classification (recommend / explain / compare / FAQ / application help).
3. Retrieval-augmented context assembly: relevant scheme records pulled from the knowledge base based on the query.
4. LLM (Gemini API) generates a response constrained to the retrieved context, in the user's selected language.
5. Response includes references to the specific scheme(s) used; if retrieval is empty, assistant states no match was found rather than generating unsupported content.
6. If the user wants to proceed with a scheme, assistant hands off into Application Guidance.

### 17.5 Application Guidance Workflow
1. User confirms intent to proceed with a scheme.
2. System loads the scheme's structured application-field metadata and document requirements.
3. Field-by-field explanation rendered in sequence, referencing the citizen's profile where relevant (e.g., pre-flagging which certificate they'll need based on their state).
4. Common-mistakes and terminology glossary surfaced inline.
5. Personalized Document Checklist shown alongside.
6. Final screen: link to the official government application portal (external redirect), clearly marked as leaving BharatAssist AI.

### 17.6 Knowledge Update Workflow (Conceptual Background Service)
This is described conceptually as an internal pipeline — no admin dashboard or CRUD UI in v1.

1. **Monitor:** Scheduled jobs poll official government sources (ministry/department sites, press release feeds, Gazette notifications) for new or changed scheme notifications.
2. **Detect:** New/changed documents are diffed against the last-known state to flag new schemes, deadline changes, or eligibility amendments.
3. **Extract:** Official PDFs/notifications are parsed and passed through an extraction pipeline (document parsing + LLM-assisted structured extraction) to pull scheme name, department, eligibility rules, benefits, documents, deadlines.
4. **Validate:** Extracted structured data is checked against confidence thresholds; low-confidence extractions are queued for review rather than auto-published (a lightweight internal review queue, not a full CMS, is acceptable for v1).
5. **Update knowledge base:** Validated records are written/updated in the scheme database with a new "last verified" timestamp and source reference.
6. **Regenerate embeddings:** Updated/new records trigger re-embedding for semantic search.
7. **Update search indexes:** Search and recommendation indexes refreshed incrementally.
8. **Notify:** Users with saved/matching schemes are notified of material changes (deadline, eligibility).

---

## 18. Security Considerations

- JWT access tokens short-lived (15 min) with rotating refresh tokens; refresh tokens invalidated on logout/password change.
- OTP flows rate-limited and throttled against brute force.
- PII (Aadhaar-adjacent identifiers, income data, disability status) encrypted at rest; never logged in plaintext.
- Principle of least privilege on backend service accounts (Cloudinary, MongoDB Atlas, Gemini API keys stored in environment secrets, never client-exposed).
- Output filtering on AI assistant responses to prevent leakage of other users' data or internal system prompts.
- CORS locked to known frontend origins; standard OWASP protections (injection, XSS, CSRF) applied across API surface.
- Redirect-out links to official portals must be validated against an allow-list of official government domains to prevent link-spoofing risks.

## 19. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Extraction pipeline misreads an official notification (wrong eligibility rule) | High — citizen makes decisions on wrong data | Confidence-threshold review queue; "last verified" + source link always visible; user-reportable "this looks wrong" flag on every scheme |
| AI assistant hallucinates despite grounding | High — trust damage | Strict RAG constraint, empty-result fallback, response-source logging, periodic hallucination audits |
| Machine translation errors in eligibility/benefit fields | High — legal/financial consequence | Human-verification flag required before exposing translated numeric/legal fields |
| Low digital literacy users can't complete flows | Medium | Plain-language mode, large-text mode, voice input consideration (future scope) |
| Government portal URLs change or go down | Medium | Automated periodic link-health checks as part of Knowledge Update System |
| Data privacy concerns given sensitive profile fields | High | DPDP Act compliance, optional-by-default sensitive fields, clear consent, export/delete rights |

## 20. Future Scope

- Voice-based interaction for low-literacy users (regional language speech-to-text).
- Proactive push notifications for newly launched schemes matching a saved profile.
- Offline-first PWA mode for low-connectivity rural areas.
- Integration with DigiLocker for document verification (still stopping short of submission).
- Community-verified "success stories" per scheme to build trust.
- Admin/reviewer dashboard for the Knowledge Update review queue (v2+, once volume justifies it).

---

## 21. Development Roadmap

### MVP Scope (V1)
- Landing Page, Authentication, Citizen Profile (core fields only), Smart Search (keyword + filters, natural language optional), Browse Categories, Scheme Details, Eligibility Checker, Personalized Document Checklist, Application Guidance (basic field/document walkthrough), AI Assistant (RAG-grounded, English + Hindi), Multilingual (English, Hindi, Kannada — remaining languages phased in), Knowledge Update System (manual-seeded database + basic monitoring job, review queue optional).

### Version 2 Scope
- Compare Schemes, Saved Schemes with deadline reminders, full Recommendation Engine (profile-based + contextual), remaining 8 languages, full Knowledge Update automation (extraction + auto-embedding + index refresh), notification system.

### Version 3 Scope
- Voice interaction, offline PWA mode, DigiLocker integration, community success stories, advanced personalization (behavioral signals), reviewer dashboard for extraction queue.

---

## 22. Tech Stack Summary

| Layer | Choice |
|---|---|
| Frontend | React, TypeScript, TailwindCSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Auth | JWT |
| Storage | Cloudinary |
| AI | Gemini API |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## 23. Module Interaction Summary

- **Citizen Profile** feeds Eligibility Checker, Recommendation Engine, and Document Checklist with baseline answers so users aren't re-asked known information.
- **Smart Search** and **Browse Categories** both terminate at **Scheme Details**, the canonical hub linking to Eligibility, Compare, and Save.
- **Eligibility Checker** output (documents + status) feeds directly into **Personalized Document Checklist**.
- **Document Checklist** and **Scheme Details** together feed **Application Guidance**, which ends in a redirect to the official portal — the platform's designed exit point.
- **AI Assistant** sits alongside every module as an alternate access layer, always retrieving from the same knowledge base that powers Search and Recommendations — never a separate source of truth.
- **Knowledge Update System** is the sole writer to the scheme database; all citizen-facing modules are readers of that database, ensuring one consistent source of truth across Search, Eligibility, and the AI Assistant.
