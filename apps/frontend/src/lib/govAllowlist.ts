/**
 * Domain allow-list validator for official Indian government portals
 * Rule 25 compliance: Never render unvalidated external URLs as official portal redirects
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

export function isValidGovDomain(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return GOV_DOMAIN_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch (err) {
    return false;
  }
}
