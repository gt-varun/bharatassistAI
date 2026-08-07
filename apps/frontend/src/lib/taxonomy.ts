import {
  GraduationCap,
  Sprout,
  Flower2,
  HeartHandshake,
  Store,
  Accessibility,
  Briefcase,
  Users,
  Banknote,
  Landmark,
  PiggyBank,
  FileBadge,
  Wrench,
  type LucideIcon
} from 'lucide-react';

/**
 * Shared vocabulary for the discovery surfaces. Slugs match the values the
 * backend stores on `schemes.targetSegments` / `schemes.benefitType`, so
 * these are the single place where a slug becomes something a citizen reads.
 */

export interface SegmentMeta {
  slug: string;
  /** Translation keys, not text: every label here reaches a citizen's screen. */
  labelKey: string;
  /** Who this is for, in the citizen's own terms — shown on category tiles. */
  blurbKey: string;
  icon: LucideIcon;
}

export const SEGMENTS: SegmentMeta[] = [
  {
    slug: 'student',
    labelKey: 'tax.segment.student',
    blurbKey: 'tax.segmentBlurb.student',
    icon: GraduationCap
  },
  {
    slug: 'farmer',
    labelKey: 'tax.segment.farmer',
    blurbKey: 'tax.segmentBlurb.farmer',
    icon: Sprout
  },
  {
    slug: 'women',
    labelKey: 'tax.segment.women',
    blurbKey: 'tax.segmentBlurb.women',
    icon: Flower2
  },
  {
    slug: 'senior_citizen',
    labelKey: 'tax.segment.senior_citizen',
    blurbKey: 'tax.segmentBlurb.senior_citizen',
    icon: HeartHandshake
  },
  {
    slug: 'msme',
    labelKey: 'tax.segment.msme',
    blurbKey: 'tax.segmentBlurb.msme',
    icon: Store
  },
  {
    slug: 'pwd',
    labelKey: 'tax.segment.pwd',
    blurbKey: 'tax.segmentBlurb.pwd',
    icon: Accessibility
  },
  {
    slug: 'jobseeker',
    labelKey: 'tax.segment.jobseeker',
    blurbKey: 'tax.segmentBlurb.jobseeker',
    icon: Briefcase
  },
  {
    slug: 'general',
    labelKey: 'tax.segment.general',
    blurbKey: 'tax.segmentBlurb.general',
    icon: Users
  }
];

export const segmentBySlug = (slug: string): SegmentMeta | undefined =>
  SEGMENTS.find((s) => s.slug === slug);

/**
 * The translation key for a segment. Callers pass it through `t()`, so an
 * unmapped slug still degrades to something readable rather than blank.
 */
export const segmentLabelKey = (slug: string): string =>
  segmentBySlug(slug)?.labelKey ?? `tax.segment.${slug}`;

export interface BenefitMeta {
  slug: string;
  labelKey: string;
  /** What the citizen actually receives. */
  blurbKey: string;
  icon: LucideIcon;
}

export const BENEFIT_TYPES: BenefitMeta[] = (
  ['cash', 'loan', 'subsidy', 'certificate', 'service'] as const
).map((slug, i) => ({
  slug,
  labelKey: `tax.benefit.${slug}`,
  blurbKey: `tax.benefitBlurb.${slug}`,
  icon: [Banknote, PiggyBank, Wrench, FileBadge, Landmark][i]
}));

export const benefitLabelKey = (slug: string): string =>
  BENEFIT_TYPES.find((b) => b.slug === slug)?.labelKey ?? `tax.benefit.${slug}`;

export const STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

export const INCOME_BANDS = ['below_1l', '1l_2_5l', '2_5l_5l', '5l_8l', 'above_8l'].map(
  (slug) => ({ slug, labelKey: `tax.income.${slug}` })
);

export const incomeLabelKey = (slug: string): string => `tax.income.${slug}`;

export const APPLICATION_STATUS: Record<
  string,
  { labelKey: string; tone: 'open' | 'closed' | 'rolling' }
> = {
  open: { labelKey: 'record.accepting', tone: 'open' },
  rolling: { labelKey: 'record.openAllYear', tone: 'rolling' },
  closed: { labelKey: 'record.closed', tone: 'closed' }
};

/** `senior_citizen` → `Senior citizen`. Last resort for unmapped slugs. */
export function humanise(slug: string): string {
  if (!slug) return '';
  const spaced = slug.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
