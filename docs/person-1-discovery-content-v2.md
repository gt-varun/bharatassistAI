# Person 1 PRD v2 — Discovery & Content

**Modules owned (unchanged):** Landing Page, Smart Scheme Search, Browse Categories, Scheme Details
**Reference:** `prd-v2.md` §1, §6, §14, §15 · original scope: [`person-1-discovery-content.md`](./person-1-discovery-content.md)
**Status:** Remaining-work addendum — integration and completion, not a redesign.

---

## 1. What changed since v1

The team already has a working discovery slice. This phase is about (a) swapping in the real premium landing page that already exists, and (b) making sure the `schemes` collection you own is populated with real, verified data instead of placeholders — everything downstream (search relevance, eligibility, AI grounding) depends on this being real.

---

## 2. §1 — Landing Page integration (P0-adjacent, do early)

- Integrate the premium landing page already built (currently sitting in the Downloads folder) into the BharatAssist AI frontend.
- **Reuse the existing implementation and assets as-is** — do not recreate or redesign it.
- Keep BharatAssist branding, existing routes, and existing functionality (search bar, CTAs, language selector, segment tiles) intact when integrating.
- Do not touch or redesign any other page as part of this task — scope is strictly the landing page swap-in.
- The landing page must still expose two equally visible onboarding entry points once the user proceeds past it, mirroring `prd-v2.md` §4.3: "Talk to BharatAssist AI" vs "I'll fill in the details myself." This is Person 3/4's flow, but the landing page's CTA wiring into it is yours.

**Acceptance:** Landing page renders the actual existing design (not a placeholder), all existing routes/CTAs still resolve correctly, no regression to other pages.

---

## 3. §6 — Scheme Database + Real Data (shared with Person 2)

- The `schemes` collection must contain real, verified government schemes — not demo/placeholder rows.
- You own: `name`, `slug`, `department`, `level`, `state`, `shortDescription`, `fullDescription`, `targetSegments`, `benefitType`, `benefitSummary`, `applicationMode`, `officialPortalUrl`, `status`, `deadline`, `lastVerifiedAt`, `sourceRef`, `translations`.
- Coordinate explicitly with Person 2 on `eligibilityRules`, `requiredDocuments`, `applicationFields`, `commonMistakes` — same document, two owners; flag any schema change to these fields in your PR description since Person 2 (and Person 3's retrieval/grounding) both depend on them.
- Prioritize strong Karnataka coverage first (per `prd-v2.md` §7's cron-expansion priority), then broaden to other states, so search/eligibility/AI grounding all have a solid regional dataset to validate against early.

**Acceptance:** No fabricated scheme records remain in the seeded dataset; every record has a real `sourceRef` and `lastVerifiedAt`.

---

## 4. §14 — User journeys (your segment)

Verify your portion of both journeys end to end against real data:

- **Guest flow:** Landing → Search/Browse → Scheme Details → hand-off into Person 2's Eligibility.
- **Registered flow:** Dashboard's "More like this" / recommendation cards (Person 3) must correctly route back into your Scheme Details.

---

## 5. §15 — Final QA (your scope)

Verify against real data: search, categories, scheme details, responsive UI (Desktop/Tablet/Mobile), accessibility (WCAG 2.1 AA basics).

---

## 6. Definition of Done (v2)

- Real premium landing page is live, reusing existing assets, with no functionality regression.
- `schemes` collection is populated with real, verified government scheme data (Karnataka-first), no placeholder rows remain.
- Search, Browse, and Scheme Details all validated against that real data, not fixtures.
- Retrieval service remains the single shared retrieval path (Person 3's AI Assistant still calls it directly — no second index introduced).
