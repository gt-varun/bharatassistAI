# Person 3 PRD v2 — AI Assistant, Voice Onboarding & Recommendations

**Modules owned (unchanged + new):** AI Assistant, Recommendation Engine, Knowledge Update System — **plus, new in v2: Voice AI and the AI-Assisted Conversational Onboarding flow**
**Reference:** `prd-v2.md` §2, §3, §4, §7, §9, §10 · original scope: [`person-3-ai-recommendations.md`](./person-3-ai-recommendations.md)
**Status:** Remaining-work addendum — integration and completion, not a redesign.

---

## 1. What changed since v1

The Knowledge Update System and AI Assistant grounding are already implemented (see the original doc's §3.4 and §7 for what's already done). What's **new** in this phase is the conversational, voice-driven onboarding flow that lets a citizen build their profile by talking to BharatAssist AI instead of filling a form — this is the largest net-new scope in v2 and is P0.

---

## 2. §2 — Login + Profile Setup: AI-Assisted path (P0)

You own the "Let BharatAssist AI help me" path end to end:

- AI asks simple questions conversationally; user can type or speak.
- AI also **speaks** the questions/responses (text-to-speech) so the user can listen, not just read.
- At the end, AI shows a summary of everything it understood; user confirms or edits before anything is saved.
- The profile is only persisted after that explicit confirmation (never silently saved mid-conversation).
- Person 4 owns the manual-setup path (Option B) and the actual profile save/skip endpoint your conversation flow ultimately calls into — you write to the same `citizenProfiles` shape they own, you don't create a parallel one.

---

## 3. §3 — Voice AI (P0)

- Speech-to-text and text-to-speech, in the user's selected language.
- User can speak naturally; AI responds audibly.
- **Reuse the existing speech infrastructure** already in the codebase — this is explicitly a completion task, not a rebuild.

---

## 4. §4 — Conversational Onboarding UX Pattern (P0, the core of this addendum)

Build this **once**, as a shared, language-parameterized module — not per-language reimplementation. Full behavioral spec is in `prd-v2.md` §4; summarized ownership below.

### 4.1 Interaction cascade
Implement the adaptive mode selection: `Voice → AI extraction → Buttons → Text → Human assistance`. The system — not the user — decides the easiest input mode per question:
- Categorical → large buttons (never forced to type/speak).
- Numeric → voice or number keypad.
- Open/free-text → voice primary, typing fallback.
- User struggling → proactively offer buttons or human/assisted help.
- User confused by a question → rephrase simpler in the same language, don't repeat verbatim.

### 4.2 Four input modes
Voice (primary), Text (secondary, language-script-aware keyboard), Simple choices/buttons (default for categorical fields), Assisted mode ("Need help?" → routes to a CSC operator/village volunteer/NGO/government centre/family member — this hand-off point is yours to build, even if the actual human network integration is out of scope for this phase; build the UI affordance and a stub/contact-routing hook).

### 4.3 Discoverability without teaching "AI"
UI copy must be action-oriented ("Tap here and speak your answer," "Register by speaking"), never AI-jargon-forward ("AI Profile Generator"). Build the mic → speaking-indicator → checkmark animated cue so the voice option is self-discoverable without explanatory text. This is copy/UX you author even though the surrounding page shell may be Person 1/4's.

### 4.4 Mandatory confirmation before saving
Every extracted value must go through an explicit "We understood X — is that correct? Yes / No, change" step before it touches the profile store. Never persist an extracted value silently.

### 4.5 Adaptive questioning
Don't run a fixed question list. Use profile fields already known to narrow candidate schemes → derive required eligibility fields from those schemes → ask only what's still missing. Support field-derivation within a single answer (e.g. birth year → approximate age) and offer an easier fallback question when the user doesn't know an answer.

### 4.6 Architecture
```
Language Selection → "Talk to BharatAssist AI" → Voice (+Text fallback)
  → Speech-to-Text → Language Understanding/Extraction → Confirmation (Yes/No, Change)
  → Profile Data Store → Scheme Engine (missing data → next question; eligibility → results)
```
This state machine is the same one both the standalone onboarding flow and the persistent AI Assistant widget should route through when collecting profile-shaped information — don't build two extraction pipelines.

**Acceptance:** the entry point after language selection shows "Talk to BharatAssist AI" and "I'll fill in the details myself" as two equally clear options (mirrors Person 1's landing-page CTA pattern) — the system never defaults into one without the user choosing.

---

## 5. §7 — Scheme Update System / Cron Job (already implemented, this phase = hardening)

Already built per the original doc §3.4 (sourceRegistry, fetcher, diffDetector, extractor, pipeline, reviewQueue, versioning, field-level writes, corrections). Remaining work this phase:
- Expand official source coverage — more central sources, more state-level sources, Karnataka-first then broaden (coordinate with Person 1's real-data seeding in `prd-v2.md` §6).
- Detect new schemes / changed benefits / changed eligibility / changed deadlines — already implemented, verify against the expanded source set.
- Configure production secrets/credentials for the live pipeline.
- Run and verify the complete update pipeline end to end against production-shaped sources.

---

## 6. §9 — AI Assistant Integration (verification pass)

Verify the complete grounded flow end to end against real data (Person 1's real schemes, not fixtures):

```
User → Intent → Scheme Retrieval → Relevant Schemes → Gemini → Grounded Answer → Source References
```

Test matrix: scheme questions, eligibility questions, document questions, benefit questions, no-result questions, wrong/unknown scheme queries, multilingual queries, scheme-specific explanations, voice interaction (new — exercises the same voice pipeline built for onboarding in §4).

Reconfirm the non-negotiable: never invent scheme names, eligibility rules, documents, deadlines, or benefit amounts; explicit "couldn't find a matching verified scheme" on empty retrieval.

---

## 7. §10 — Dashboard Integration (joint with Person 4)

```
Login → Profile → Recommendations → Dashboard
```

You own: recommended schemes, "why recommended" explanations, deadlines-from-recommendations, AI Assistant access entry point. Person 4 owns: saved schemes, profile completion indicator. Verify the combined dashboard against real login → profile → recommendation data end to end.

---

## 8. Definition of Done (v2)

- AI-Assisted profile setup (voice + text) fully functional, reusing existing speech infrastructure, with mandatory confirm-before-save at every extracted field.
- The conversational onboarding state machine is a single shared, language-parameterized module — verified working (or at minimum architecturally ready) across all 11 languages once Person 4's i18n coverage lands per language.
- Four input modes (voice, text, buttons, assisted/"Need help?") all functional, with adaptive mode selection driven by the system, not a user-selected mode toggle.
- Cron/update pipeline runs against expanded, production-configured official sources with no manual scheduler rebuild.
- AI Assistant grounding verified against real scheme data across the full test matrix, including voice interaction.
- Dashboard recommendations verified against real login → profile → recommendation data.
