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
  label: string;
  /** Who this is for, in the citizen's own terms — shown on category tiles. */
  blurb: string;
  icon: LucideIcon;
}

export const SEGMENTS: SegmentMeta[] = [
  {
    slug: 'student',
    label: 'Students',
    blurb: 'Scholarships, fee waivers and hostel support from school through post-graduation.',
    icon: GraduationCap
  },
  {
    slug: 'farmer',
    label: 'Farmers',
    blurb: 'Income support, crop insurance, equipment subsidy and irrigation schemes.',
    icon: Sprout
  },
  {
    slug: 'women',
    label: 'Women',
    blurb: 'Maternity benefits, self-employment loans and safety and skilling programmes.',
    icon: Flower2
  },
  {
    slug: 'senior_citizen',
    label: 'Senior citizens',
    blurb: 'Old-age pension, healthcare cover and travel and utility concessions.',
    icon: HeartHandshake
  },
  {
    slug: 'msme',
    label: 'Small business',
    blurb: 'Collateral-free credit, subsidy on machinery and market linkage support.',
    icon: Store
  },
  {
    slug: 'pwd',
    label: 'Persons with disability',
    blurb: 'Assistive devices, reserved jobs, pension and accessibility grants.',
    icon: Accessibility
  },
  {
    slug: 'jobseeker',
    label: 'Job seekers',
    blurb: 'Skill training with stipend, apprenticeship and placement-linked schemes.',
    icon: Briefcase
  },
  {
    slug: 'general',
    label: 'Every citizen',
    blurb: 'Housing, health cover, food security and utility schemes open to all.',
    icon: Users
  }
];

export const segmentBySlug = (slug: string): SegmentMeta | undefined =>
  SEGMENTS.find((s) => s.slug === slug);

export const segmentLabel = (slug: string): string =>
  segmentBySlug(slug)?.label ?? humanise(slug);

export interface BenefitMeta {
  slug: string;
  label: string;
  /** What the citizen actually receives. */
  blurb: string;
  icon: LucideIcon;
}

export const BENEFIT_TYPES: BenefitMeta[] = [
  { slug: 'cash', label: 'Direct cash', blurb: 'Money paid into your bank account', icon: Banknote },
  { slug: 'loan', label: 'Loan', blurb: 'Credit at a subsidised rate', icon: PiggyBank },
  { slug: 'subsidy', label: 'Subsidy', blurb: 'A discount on something you buy', icon: Wrench },
  { slug: 'certificate', label: 'Fee waiver', blurb: 'Fees reduced or written off', icon: FileBadge },
  { slug: 'service', label: 'Service', blurb: 'Training, treatment or facilities', icon: Landmark }
];

export const benefitLabel = (slug: string): string =>
  BENEFIT_TYPES.find((b) => b.slug === slug)?.label ?? humanise(slug);

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

export const INCOME_BANDS = [
  { slug: 'below_1l', label: 'Under ₹1 lakh a year' },
  { slug: '1l_2_5l', label: '₹1 – 2.5 lakh a year' },
  { slug: '2_5l_5l', label: '₹2.5 – 5 lakh a year' },
  { slug: '5l_8l', label: '₹5 – 8 lakh a year' },
  { slug: 'above_8l', label: 'Over ₹8 lakh a year' }
];

export const APPLICATION_STATUS: Record<
  string,
  { label: string; tone: 'open' | 'closed' | 'rolling' }
> = {
  open: { label: 'Accepting applications', tone: 'open' },
  rolling: { label: 'Open all year', tone: 'rolling' },
  closed: { label: 'Closed for now', tone: 'closed' }
};

/** `senior_citizen` → `Senior citizen`. Last resort for unmapped slugs. */
export function humanise(slug: string): string {
  if (!slug) return '';
  const spaced = slug.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
