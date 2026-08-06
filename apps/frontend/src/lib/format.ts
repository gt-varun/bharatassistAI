/**
 * Formatting helpers for the register. Dates are rendered in the short,
 * unambiguous form a notification uses (12 Mar 2026) rather than a locale
 * default that can flip day and month.
 */

const DAY_MS = 86_400_000;

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

export function daysSince(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

/** PRD §12: a record unverified for more than 90 days is flagged in the UI. */
export function isStale(lastVerifiedAt: string | Date | null | undefined): boolean {
  const age = daysSince(lastVerifiedAt);
  return age !== null && age > 90;
}

export function relativeVerified(value: string | Date | null | undefined): string {
  const age = daysSince(value);
  if (age === null) return 'Not verified';
  if (age <= 0) return 'Verified today';
  if (age === 1) return 'Verified yesterday';
  if (age < 30) return `Verified ${age} days ago`;
  if (age < 60) return 'Verified last month';
  return `Verified ${Math.floor(age / 30)} months ago`;
}

/** Two-letter monogram for avatars: "Varun Y R" → "VR", "9845…" → "91". */
export function initials(name: string | null | undefined): string {
  if (!name) return 'BA';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Masks a phone number for display: 9845012345 → 98450 ••• 45. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  return `${digits.slice(0, 5)} ••• ${digits.slice(-2)}`;
}

/** Builds a stable, human-readable record id from a scheme's source ref. */
export function recordRef(sourceRef: string | null | undefined, slug: string): string {
  if (sourceRef && sourceRef.trim()) return sourceRef.trim();
  return slug ? slug.toUpperCase().replace(/-/g, '/') : 'UNREFERENCED';
}
