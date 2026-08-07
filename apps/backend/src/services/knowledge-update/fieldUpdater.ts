/**
 * Field-level (not full-document) writes — the update path in pipeline.ts
 * never overwrites a scheme with a fresh extraction's full shape. It computes
 * a targeted `$set` of only what actually changed, and — deliberately —
 * never lets an empty extracted value blank out real existing data. If a
 * re-fetch's page happened not to restate the document list, the document
 * list the platform already trusted is left exactly as it was.
 */

export const SCHEME_UPDATABLE_FIELDS = [
  'name',
  'department',
  'level',
  'state',
  'shortDescription',
  'fullDescription',
  'targetSegments',
  'benefitType',
  'benefitSummary',
  'eligibilityRules',
  'eligibilitySummaryPlain',
  'requiredDocuments',
  'applicationMode',
  'officialPortalUrl',
  'applicationFields',
  'commonMistakes',
  'deadline',
  'status'
] as const;

export type SchemeUpdatableField = (typeof SCHEME_UPDATABLE_FIELDS)[number];

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

export interface FieldChangeResult {
  changedFields: SchemeUpdatableField[];
  setPayload: Record<string, unknown>;
}

/**
 * Diffs an extraction against the existing scheme document, field by field.
 *
 * Two rules, both deliberate:
 * 1. `setPayload` only ever contains fields that actually differ — a
 *    deadline update can never accidentally also clobber `requiredDocuments`,
 *    because `requiredDocuments` was never in the payload to begin with.
 * 2. An empty extracted value is never treated as "the new truth" over a
 *    non-empty existing one. Silence in a re-fetch means "not restated",
 *    not "removed".
 *
 * `existing` is `null` for a brand-new scheme — in that case every provided
 * field (empty or not) is treated as a change, since there is nothing yet
 * to accidentally overwrite. In practice the pipeline's create path writes
 * the full document directly rather than going through here; this function
 * is written to behave correctly either way.
 */
export function computeFieldChanges(
  existing: Record<string, any> | null,
  extracted: Record<string, any>
): FieldChangeResult {
  const changedFields: SchemeUpdatableField[] = [];
  const setPayload: Record<string, unknown> = {};

  for (const key of SCHEME_UPDATABLE_FIELDS) {
    const newVal = extracted[key];
    const oldVal = existing ? existing[key] : undefined;

    if (existing && isEmptyValue(newVal) && !isEmptyValue(oldVal)) continue;

    const unchanged = JSON.stringify(newVal ?? null) === JSON.stringify(oldVal ?? null);
    if (unchanged) continue;

    changedFields.push(key);
    setPayload[key] = newVal;
  }

  return { changedFields, setPayload };
}
