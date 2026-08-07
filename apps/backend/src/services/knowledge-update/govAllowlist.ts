/**
 * Backend mirror of apps/frontend/src/lib/govAllowlist.ts.
 *
 * Rule 25 (docs/rules.md) requires an official-portal redirect to be
 * validated against a gov domain allow-list "before rendering" — the
 * frontend enforces that at the point of the redirect link. The Knowledge
 * Update System needs the same check *before that*: an extraction whose
 * `officialPortalUrl` isn't on a recognised government domain must never be
 * scored as high-confidence, or a scraped/mistyped URL could get published
 * as the thing citizens are redirected to. Kept as a small duplicated list
 * rather than a shared package — the two apps don't currently share a utils
 * package, and this list changes rarely enough that duplication is cheaper
 * than the extra workspace wiring for something this small.
 */
const GOV_DOMAIN_PATTERNS = [
  /\.gov\.in$/i,
  /\.nic\.in$/i,
  /\.org\.in$/i,
  /\.edu\.in$/i,
  /\.ac\.in$/i,
  /^https?:\/\/[a-z0-9-]+\.(karnataka|maharashtra|delhi|kerala|tn)\.gov\.in/i,
  /^https?:\/\/pmkisan\.gov\.in/i,
  /^https?:\/\/mudra\.org\.in/i,
  /^https?:\/\/nsap\.nic\.in/i,
  /^https?:\/\/ssp\.postmatric\.karnataka\.gov\.in/i
];

export function isValidGovDomain(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    // Hostname only, deliberately — matching against the raw URL string
    // would let a `^https?://...` anchored pattern match a path segment
    // that merely *ends with* a trusted-looking suffix (e.g.
    // https://evil.example.com/redirect/pmkisan.gov.in), while the actual
    // host is untrusted. The hostname is the only part of the URL that
    // says who actually serves the redirect.
    const hostname = new URL(url).hostname;
    return GOV_DOMAIN_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}
