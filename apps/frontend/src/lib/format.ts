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

/**
 * How long ago a record was verified, returned as a translation key and its
 * count rather than a finished English sentence. The caller spreads the pair
 * into `t(...)`, so this phrase follows the chosen language like every other
 * piece of the interface.
 */
export function relativeVerified(
  value: string | Date | null | undefined
): [string, { count: number }] {
  const age = daysSince(value);
  if (age === null) return ['record.notVerified', { count: 0 }];
  if (age <= 0) return ['record.verifiedToday', { count: 0 }];
  if (age === 1) return ['record.verifiedYesterday', { count: 1 }];
  if (age < 30) return ['record.verifiedDaysAgo', { count: age }];
  if (age < 60) return ['record.verifiedLastMonth', { count: 1 }];
  return ['record.verifiedMonthsAgo', { count: Math.floor(age / 30) }];
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
