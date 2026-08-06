/**
 * One place that understands income bands.
 *
 * Three vocabularies for the same idea had grown up independently — the
 * frontend taxonomy ('below_1l', '1l_2_5l'), the search filters
 * ('under_2.5l', '2.5l_to_5l') and the seeded profile ('<2.5L'). They are all
 * accepted here so that whichever surface a value came from, it means the
 * same thing to the rule engine.
 *
 * A band is a *range*, not a point. Collapsing it to one number is what made
 * the engine wrong: someone in the ₹2.5L–5L band was being read as earning
 * ₹5L and refused a scheme with a ₹2.5L ceiling, even though the bottom of
 * their band clears it. Ranges let us tell the three cases apart — clearly
 * under, clearly over, and genuinely unknown.
 */

export interface IncomeRange {
  /** Lower bound, inclusive. */
  min: number;
  /** Upper bound, inclusive. `Infinity` for open-ended top bands. */
  max: number;
}

const LAKH = 100000;

/** Canonical bands, keyed by every spelling we have seen in the codebase. */
const BAND_ALIASES: Array<[IncomeRange, string[]]> = [
  [{ min: 0, max: 1 * LAKH }, ['below_1l', 'under_1l', '<1l', 'below 1l']],
  [
    { min: 0, max: 2.5 * LAKH },
    ['under_2.5l', 'below_2.5l', '<2.5l', '< 2.5l', 'below 2.5', 'upto_2.5l']
  ],
  [{ min: 1 * LAKH, max: 2.5 * LAKH }, ['1l_2_5l', '1l-2.5l', '1l_to_2.5l']],
  [
    { min: 2.5 * LAKH, max: 5 * LAKH },
    ['2_5l_5l', '2.5l-5l', '2.5l - 5l', '2.5l_to_5l', '2_5l_to_5l']
  ],
  [{ min: 5 * LAKH, max: 8 * LAKH }, ['5l_8l', '5l-8l', '5l_to_8l']],
  [{ min: 5 * LAKH, max: Infinity }, ['>5l', '> 5l', 'above 5l', 'above_5l']],
  [{ min: 8 * LAKH, max: Infinity }, ['above_8l', '>8l', 'above 8l', 'over_8l']]
];

function normalise(band: string): string {
  return band.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolves a band label to a numeric range. Returns null when the label is
 * not recognised, so the caller can treat income as unknown rather than
 * inventing a figure.
 */
export function parseIncomeBand(band: string | null | undefined): IncomeRange | null {
  if (!band) return null;
  const key = normalise(band);

  // A bare number is an exact figure, not a band.
  const asNumber = Number(key);
  if (!Number.isNaN(asNumber) && key !== '') return { min: asNumber, max: asNumber };

  for (const [range, aliases] of BAND_ALIASES) {
    if (aliases.includes(key)) return range;
  }

  // Last resort: read the lakh figures out of an unrecognised label, e.g.
  // "3l_6l" -> 3–6 lakh, "7l" -> 7 lakh and above.
  const figures = [...key.matchAll(/([\d.]+)\s*l/g)].map((m) => parseFloat(m[1]) * LAKH);
  if (figures.length >= 2) return { min: figures[0], max: figures[1] };
  if (figures.length === 1) {
    if (key.startsWith('<') || key.includes('below') || key.includes('under')) {
      return { min: 0, max: figures[0] };
    }
    if (key.startsWith('>') || key.includes('above') || key.includes('over')) {
      return { min: figures[0], max: Infinity };
    }
    return { min: 0, max: figures[0] };
  }

  return null;
}

export type CeilingVerdict = 'within' | 'exceeds' | 'unknown';

/**
 * Judges an income range against a scheme's maximum.
 *
 * - `within`  — the whole band clears the ceiling.
 * - `exceeds` — the whole band is above it.
 * - `unknown` — the band straddles the ceiling, so the citizen has to give an
 *               exact figure. Guessing here would either deny someone a
 *               benefit they qualify for or promise one they do not.
 */
export function judgeAgainstCeiling(range: IncomeRange | null, ceiling: number): CeilingVerdict {
  if (!range) return 'unknown';
  if (range.max <= ceiling) return 'within';
  if (range.min > ceiling) return 'exceeds';
  return 'unknown';
}

/** Formats a range the way a citizen would read it back. */
export function describeRange(range: IncomeRange): string {
  const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  if (range.min === range.max) return rupees(range.min);
  if (range.max === Infinity) return `over ${rupees(range.min)}`;
  if (range.min === 0) return `up to ${rupees(range.max)}`;
  return `${rupees(range.min)} – ${rupees(range.max)}`;
}
