# Person 4 — Identity, Profile & Platform

**Modules owned:** Authentication, Citizen Profile, Saved Schemes, Multilingual Support (mechanism)
**Reference:** `prd.md` §11.2, §11.3, §11.9, §11.13

---

## 1. Scope Summary
You own the platform-level layer everyone else's feature sits on: who the user is, what we know about them, what they've bookmarked, and what language they're using. Ship Auth + Profile first — the other three need a real logged-in user and real profile data to build and test their own modules against from day one.

---

## 2. Frontend

### 2.1 Authentication
- Signup/login via mobile + OTP (primary) and email + password (secondary).
- OTP entry with resend (rate-limited), password reset flow.
- Guest mode: full search/browse/eligibility usable without login; login prompt only on save/persist actions.

### 2.2 Citizen Profile
- Profile form: state (only required field), district, age, gender, occupation category, income band, education level, category, disability status, marital status, land ownership, business type — all others optional.
- Profile completeness indicator (nudge, not a gate).
- Settings: language preference, notifications, data export, account deletion (DPDP Act compliance).

### 2.3 Saved Schemes
- Bookmarked list with status tabs: Saved, Eligibility Checked, Application In Progress, Applied (self-reported).
- Deadline reminder indicators for saved schemes approaching real deadlines.

### 2.4 Multilingual Support (mechanism)
- Global language selector component, consumed by every other slice.
- i18n infrastructure: translation file structure per language, switching without full reload, RTL support for Urdu.
- Enforce: a language isn't selectable until its UI string coverage is complete — no partial translations exposed.

---

## 3. Backend

### 3.1 API Endpoints (`auth/`, `profile/`, `saved/`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/otp/request` | POST | Send OTP to phone |
| `/api/auth/otp/verify` | POST | Verify OTP, issue JWT access + refresh tokens |
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/refresh` | POST | Rotate refresh token, issue new access token |
| `/api/auth/logout` | POST | Invalidate refresh token (`refreshTokenVersion` increment) |
| `/api/profile` | GET/PUT | Fetch/update citizen profile |
| `/api/profile/export` | GET | DPDP-compliant data export |
| `/api/profile` | DELETE | Account deletion |
| `/api/saved` | GET/POST/PATCH/DELETE | Manage saved schemes and status |

### 3.2 Auth Middleware
- JWT access tokens short-lived (15 min); rotating refresh tokens invalidated on logout/password change via `refreshTokenVersion`.
- OTP rate limiting/throttling against brute force.
- Used by every protected route across all four slices — treat changes here as shared infrastructure, flag clearly in the PR.

---

## 4. Database

### Collections you own:
- **`users`** (full schema: `scheme-database.md` §3) — `phone`, `email`, `passwordHash`, `preferredLanguage`, `refreshTokenVersion`.
- **`citizenProfiles`** (full schema: `scheme-database.md` §4) — all profile fields, `{ userId: 1 }` unique.
- **`savedSchemes`** (full schema: `scheme-database.md` §7) — `userId`, `schemeId`, `status`, `savedAt`.

### Indexes
- `{ phone: 1 }` unique sparse, `{ email: 1 }` unique sparse on `users`.
- `{ userId: 1 }` unique on `citizenProfiles`.
- `{ userId: 1, schemeId: 1 }` unique on `savedSchemes`.

---

## 5. Workflow
- Feature branches, PR into `main`, reviewed by at least one other person.
- Ship OTP auth + minimal profile end-to-end first — this unblocks Person 1, 2, and 3's own PRs, which will need to test against a real authenticated user.

## 6. Definition of Done
- OTP and email/password auth both functional; refresh-token rotation and logout-everywhere work correctly.
- Profile remains fully optional beyond `state`; no other module hard-blocks on missing profile fields.
- i18n supports English + Hindi + Kannada at full coverage at minimum, with incomplete languages hidden from the selector.
- Data export and account deletion functional (DPDP Act compliance).
