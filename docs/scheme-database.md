# BharatAssist AI — MongoDB Database Design

Companion to `prd.md`, `repo-setup.md`, and `development.md`. This defines the MongoDB Atlas collections, their fields, indexes, and relationships. It mirrors the `shared-types` package referenced in `repo-setup.md` §1.3 — the TypeScript interfaces there should match these field names exactly.

---

## 1. Collections Overview

| Collection | Purpose | Primary Owner (per repo-setup.md Part 2) |
|---|---|---|
| `schemes` | Canonical government scheme records | Person A |
| `users` | Auth accounts | Person D |
| `citizenProfiles` | Structured profile data per user | Person D |
| `eligibilityResults` | Stored eligibility check outcomes per user per scheme | Person B |
| `documentChecklists` | Personalized checklist state per user per scheme | Person B |
| `savedSchemes` | Bookmarks + application-progress status | Person D |
| `conversations` | AI Assistant chat history | Person C |
| `knowledgeUpdateLog` | Audit trail for the background Knowledge Update System | Person C (or shared backend owner) |

---

## 2. `schemes`

The source-of-truth collection. Every other collection references this one by `schemeId`.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | Scheme name |
| `slug` | String | URL-safe identifier, unique |
| `department` | String | Issuing ministry/department |
| `level` | String (`central` \| `state`) | |
| `state` | String \| null | Null if central scheme |
| `shortDescription` | String | Used in search results/cards |
| `fullDescription` | String | Scheme detail page |
| `targetSegments` | [String] | e.g. `["student","women","msme"]` — drives Browse Categories |
| `benefitType` | String | `cash` \| `loan` \| `subsidy` \| `certificate` \| `service` |
| `benefitSummary` | String | Plain-language benefit description |
| `eligibilityRules` | Object (see §2.1) | Structured, machine-evaluable rules |
| `eligibilitySummaryPlain` | String | Human-readable summary shown on Scheme Details |
| `requiredDocuments` | [Object] (see §2.2) | |
| `applicationMode` | String | `online` \| `offline` \| `both` |
| `officialPortalUrl` | String | Validated against allow-list of gov domains (PRD §18) |
| `applicationFields` | [Object] (see §2.3) | Powers Application Guidance walkthrough |
| `commonMistakes` | [String] | Scheme-specific tips |
| `deadline` | Date \| null | Null if rolling/no deadline |
| `status` | String | `open` \| `closed` \| `rolling` |
| `translations` | Object | Keyed by language code, see §2.4 |
| `lastVerifiedAt` | Date | Set by Knowledge Update System |
| `sourceRef` | String | Notification/Gazette reference or URL |
| `extractionConfidence` | Number \| null | 0–1, set when record originated from automated extraction |
| `createdAt` / `updatedAt` | Date | |

### 2.1 `eligibilityRules` (example shape)
```json
{
  "state": ["Karnataka"],
  "ageMin": 18,
  "ageMax": 35,
  "incomeMax": 250000,
  "occupationCategory": ["student"],
  "genderRestriction": null,
  "categoryRestriction": ["General", "OBC", "SC", "ST", "EWS"],
  "additionalConditions": [
    { "field": "educationLevel", "operator": "in", "value": ["undergraduate", "postgraduate"] }
  ]
}
```
Kept generic (`field`/`operator`/`value`) in `additionalConditions` so new scheme-specific rules don't require a schema migration.

### 2.2 `requiredDocuments` (array item shape)
```json
{ "label": "Income Certificate", "howToObtain": "Apply at your Taluk office or state e-portal", "mandatory": true }
```

### 2.3 `applicationFields` (array item shape)
```json
{ "fieldName": "Applicant Name", "instructions": "Must exactly match Aadhaar spelling", "mandatory": true }
```

### 2.4 `translations` (keyed by ISO language code)
```json
{
  "hi": { "name": "...", "shortDescription": "...", "eligibilitySummaryPlain": "...", "verified": true },
  "kn": { "name": "...", "shortDescription": "...", "eligibilitySummaryPlain": "...", "verified": false }
}
```
`verified: false` flags machine-translated numeric/legal content pending human review (PRD §11.13) — the frontend must not present unverified translated eligibility/benefit numbers as final without a visible caveat.

### Indexes
- `{ slug: 1 }` unique
- `{ targetSegments: 1, state: 1, status: 1 }` — category/filter browsing
- Text index on `name`, `shortDescription`, `fullDescription` — keyword search
- `{ lastVerifiedAt: 1 }` — staleness checks
- Vector/embedding index (Atlas Vector Search) on a companion `embedding` field for semantic search — store as a separate `schemeEmbeddings` collection keyed by `schemeId` if embeddings are large/updated on a different cadence than the scheme record itself.

---

## 3. `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `phone` | String \| null | Unique if present |
| `email` | String \| null | Unique if present |
| `passwordHash` | String \| null | Null if OTP-only account |
| `preferredLanguage` | String | ISO code, default `en` |
| `refreshTokenVersion` | Number | Incremented to invalidate all refresh tokens (logout-everywhere, password change) |
| `createdAt` / `updatedAt` | Date | |

Indexes: `{ phone: 1 }` unique sparse, `{ email: 1 }` unique sparse.

## 4. `citizenProfiles`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId | ref `users`, unique |
| `state` | String | Only strictly required field per PRD §11.3 |
| `district` | String \| null | |
| `age` | Number \| null | |
| `gender` | String \| null | |
| `occupationCategory` | String \| null | |
| `incomeBand` | String \| null | e.g. `<2.5L`, `2.5L-5L`, `>5L` |
| `educationLevel` | String \| null | |
| `category` | String \| null | General/OBC/SC/ST/EWS — user-controlled, optional |
| `disabilityStatus` | Boolean \| null | |
| `landOwnershipAcres` | Number \| null | Farmer schemes |
| `businessType` | String \| null | MSME schemes |
| `updatedAt` | Date | |

Index: `{ userId: 1 }` unique.

## 5. `eligibilityResults`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId | ref `users` |
| `schemeId` | ObjectId | ref `schemes` |
| `status` | String | `eligible` \| `partially_eligible` \| `not_eligible` |
| `reasons` | [String] | |
| `missingRequirements` | [String] | |
| `alternativeSchemeIds` | [ObjectId] | ref `schemes` |
| `answeredAt` | Date | |

Index: `{ userId: 1, schemeId: 1 }` unique (latest result per user/scheme; keep history in a separate log collection if historical tracking is wanted later).

## 6. `documentChecklists`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId | ref `users` |
| `schemeId` | ObjectId | ref `schemes` |
| `items` | [Object] | `{ label, status: "have"|"missing", howToObtain }` |
| `updatedAt` | Date | |

Index: `{ userId: 1, schemeId: 1 }` unique.

## 7. `savedSchemes`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId | ref `users` |
| `schemeId` | ObjectId | ref `schemes` |
| `status` | String | `saved` \| `eligibility_checked` \| `application_in_progress` \| `applied` (self-reported) |
| `savedAt` | Date | |

Index: `{ userId: 1, schemeId: 1 }` unique.

## 8. `conversations`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId \| null | Null for guest sessions (ephemeral, not persisted long-term) |
| `messages` | [Object] | `{ role: "user"|"assistant", content, timestamp, sourceSchemeIds: [ObjectId] }` |
| `language` | String | |
| `createdAt` / `updatedAt` | Date | |

`sourceSchemeIds` on assistant messages is the traceability field required by PRD §12 (Auditability) — every factual assistant response logs which scheme records it was grounded in.

Index: `{ userId: 1, updatedAt: -1 }`.

## 9. `knowledgeUpdateLog`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `schemeId` | ObjectId \| null | Null if this run produced a new scheme not yet assigned |
| `action` | String | `created` \| `updated` \| `flagged_for_review` |
| `sourceUrl` | String | Where the notification/PDF was found |
| `extractionConfidence` | Number | 0–1 |
| `diffSummary` | String | What changed vs. previous version |
| `reviewedBy` | String \| null | Null until reviewed (if below confidence threshold) |
| `runAt` | Date | |

Index: `{ schemeId: 1, runAt: -1 }`, `{ action: 1, reviewedBy: 1 }` (to query the pending-review queue, PRD §17.6 step 4).

---

## 10. Sample `schemes` Document

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0d",
  "name": "Karnataka Vidyasiri Scholarship",
  "slug": "karnataka-vidyasiri-scholarship",
  "department": "Department of Collegiate Education, Karnataka",
  "level": "state",
  "state": "Karnataka",
  "shortDescription": "Fee reimbursement scholarship for undergraduate students from low-income families.",
  "fullDescription": "Full scheme description in plain language...",
  "targetSegments": ["student"],
  "benefitType": "subsidy",
  "benefitSummary": "Full tuition fee reimbursement for eligible undergraduate students.",
  "eligibilityRules": {
    "state": ["Karnataka"],
    "ageMin": 17,
    "ageMax": 25,
    "incomeMax": 250000,
    "occupationCategory": ["student"],
    "genderRestriction": null,
    "categoryRestriction": ["General", "OBC", "SC", "ST", "EWS"],
    "additionalConditions": [
      { "field": "educationLevel", "operator": "in", "value": ["undergraduate"] }
    ]
  },
  "eligibilitySummaryPlain": "Open to Karnataka undergraduate students from families earning under ₹2.5 lakh per year.",
  "requiredDocuments": [
    { "label": "Income Certificate", "howToObtain": "Apply at your Taluk office or Karnataka e-portal", "mandatory": true },
    { "label": "Caste Certificate", "howToObtain": "Apply via Nadakacheri", "mandatory": false },
    { "label": "College Bonafide Certificate", "howToObtain": "Request from your college administration", "mandatory": true }
  ],
  "applicationMode": "online",
  "officialPortalUrl": "https://example-gov-portal.karnataka.gov.in/vidyasiri",
  "applicationFields": [
    { "fieldName": "Applicant Name", "instructions": "Must exactly match Aadhaar spelling", "mandatory": true },
    { "fieldName": "College Name", "instructions": "Select from the official college list, do not free-type", "mandatory": true }
  ],
  "commonMistakes": ["Name mismatch with Aadhaar", "Uploading expired income certificate"],
  "deadline": "2026-09-30T00:00:00.000Z",
  "status": "open",
  "translations": {
    "hi": {
      "name": "कर्नाटक विद्यासिरी छात्रवृत्ति",
      "shortDescription": "कम आय वाले परिवारों के स्नातक छात्रों के लिए शुल्क प्रतिपूर्ति छात्रवृत्ति।",
      "eligibilitySummaryPlain": "कर्नाटक के उन स्नातक छात्रों के लिए जिनकी पारिवारिक आय 2.5 लाख रुपये प्रति वर्ष से कम है।",
      "verified": true
    },
    "kn": {
      "name": "ಕರ್ನಾಟಕ ವಿದ್ಯಾಸಿರಿ ವಿದ್ಯಾರ್ಥಿವೇತನ",
      "shortDescription": "ಕಡಿಮೆ ಆದಾಯದ ಕುಟುಂಬಗಳ ಪದವಿಪೂರ್ವ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಶುಲ್ಕ ಮರುಪಾವತಿ ವಿದ್ಯಾರ್ಥಿವೇತನ.",
      "eligibilitySummaryPlain": "ವಾರ್ಷಿಕ 2.5 ಲಕ್ಷ ರೂ.ಗಿಂತ ಕಡಿಮೆ ಆದಾಯ ಹೊಂದಿರುವ ಕರ್ನಾಟಕದ ಪದವಿಪೂರ್ವ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ.",
      "verified": false
    }
  },
  "lastVerifiedAt": "2026-06-15T00:00:00.000Z",
  "sourceRef": "Karnataka Gazette Notification No. XYZ/2026",
  "extractionConfidence": 0.93,
  "createdAt": "2026-06-15T00:00:00.000Z",
  "updatedAt": "2026-06-15T00:00:00.000Z"
}
```

---

## 11. Relationships Diagram

```
users ──1:1── citizenProfiles
users ──1:N── savedSchemes ──N:1── schemes
users ──1:N── eligibilityResults ──N:1── schemes
users ──1:N── documentChecklists ──N:1── schemes
users ──1:N── conversations (messages reference schemes via sourceSchemeIds)
schemes ──1:N── knowledgeUpdateLog (audit trail per scheme)
```

`schemes` is the only collection written to by the Knowledge Update System (PRD §17.6, §23) — every other collection only reads from it or references it by `schemeId`, keeping one consistent source of truth.
