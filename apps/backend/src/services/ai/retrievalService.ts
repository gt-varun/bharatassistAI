import { SchemeModel } from '../../models/Scheme.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { semanticSearch, reciprocalRankFusion } from './vectorSearch.js';
import { Scheme } from '@bharatassist/shared-types';

export interface SearchParams {
  query?: string;
  level?: 'central' | 'state';
  state?: string;
  segment?: string;
  benefitType?: 'cash' | 'loan' | 'subsidy' | 'certificate' | 'service';
  incomeBand?: string;
  department?: string;
  status?: 'open' | 'closed' | 'rolling';
  page?: number;
  limit?: number;
  userId?: string;
  /** ISO code of the language the citizen is reading in, e.g. 'hi'. */
  lang?: string;
}

export interface SearchResult {
  schemes: Scheme[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CategorySummary {
  segments: Record<string, number>;
  benefitTypes: Record<string, number>;
  levels: Record<string, number>;
  states: Record<string, number>;
}

/**
 * Overlays a verified translation onto the reader's language.
 *
 * Scheme records store their source (English) text at the top level and any
 * translated copy under `translations.<lang>`. Only a translation marked
 * `verified` is shown — an unreviewed machine translation of an eligibility
 * rule is worse than English, because a citizen will act on it. Untranslated
 * fields fall back to the source text rather than blanking out.
 */
export function localiseScheme(scheme: Scheme, lang?: string): Scheme {
  if (!lang || lang === 'en') return scheme;

  const raw = (scheme as any).translations;
  if (!raw) return scheme;

  // `translations` is a Mongoose Map; .lean() gives a plain object, but a
  // hydrated document gives a real Map. Handle both.
  const t = raw instanceof Map ? raw.get(lang) : raw[lang];
  if (!t || t.verified !== true) return scheme;

  return {
    ...scheme,
    name: t.name || scheme.name,
    shortDescription: t.shortDescription || scheme.shortDescription,
    eligibilitySummaryPlain: t.eligibilitySummaryPlain || scheme.eligibilitySummaryPlain
  };
}

/**
 * Extracts structured filter hints from free text query
 */
function extractFiltersFromQuery(queryStr: string): Partial<SearchParams> {
  const hints: Partial<SearchParams> = {};
  const lower = queryStr.toLowerCase();

  // Segments
  // Slugs must match `targetSegments` values exactly, or the filter silently
  // matches nothing.
  const SEGMENT_HINTS: Array<[string, string[]]> = [
    ['student', ['student', 'scholarship', 'college', 'school', 'study', 'tuition', 'छात्र', 'छात्रवृत्ति']],
    ['farmer', ['farmer', 'farming', 'agriculture', 'kisan', 'crop', 'irrigation', 'किसान', 'फसल']],
    ['pwd', ['disability', 'disabled', 'divyang', 'wheelchair', 'blind', 'deaf', 'दिव्यांग']],
    ['senior_citizen', ['senior', 'old age', 'elderly', 'pensioner', 'वृद्ध', 'बुजुर्ग']],
    ['women', ['women', 'woman', 'female', 'girl', 'mother', 'maternity', 'widow', 'महिला', 'बालिका']],
    ['jobseeker', ['job', 'unemploy', 'employment', 'skill training', 'placement', 'रोजगार', 'बेरोजगार']],
    ['msme', ['msme', 'business', 'enterprise', 'startup', 'shop', 'artisan', 'व्यवसाय', 'उद्यम']]
  ];
  for (const [slug, words] of SEGMENT_HINTS) {
    if (words.some((w) => lower.includes(w))) {
      hints.segment = slug;
      break;
    }
  }

  // States — matched against the same names the records are stored under.
  const STATES = [
    'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan',
    'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];
  const matchedState = STATES.find((st) => lower.includes(st.toLowerCase()));
  if (matchedState) hints.state = matchedState;
  else if (lower.includes('central') || lower.includes('pm ')) hints.level = 'central';

  return hints;
}

/**
 * Shared Retrieval Service function used by Search APIs and AI Assistant
 */
export async function searchSchemes(params: SearchParams): Promise<SearchResult> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 10));
  const skip = (page - 1) * limit;

  const mongoQuery: Record<string, any> = {};

  // Extract structured filter hints if free text provided
  if (params.query && params.query.trim()) {
    const extracted = extractFiltersFromQuery(params.query.trim());
    if (extracted.segment && !params.segment) params.segment = extracted.segment;
    if (extracted.state && !params.state) params.state = extracted.state;
    if (extracted.level && !params.level) params.level = extracted.level;
  }

  // Exact filters
  if (params.level) mongoQuery.level = params.level;
  if (params.state) {
    mongoQuery.$or = [
      { state: params.state },
      { level: 'central' },
      { 'eligibilityRules.state': { $in: [params.state, 'All India', 'ANY'] } }
    ];
  }
  if (params.segment) mongoQuery.targetSegments = params.segment;
  if (params.benefitType) mongoQuery.benefitType = params.benefitType;
  if (params.department) mongoQuery.department = new RegExp(params.department, 'i');
  if (params.status) mongoQuery.status = params.status;

  if (params.incomeBand) {
    if (params.incomeBand === 'under_2.5l') {
      mongoQuery['eligibilityRules.incomeMax'] = { $gte: 250000 };
    } else if (params.incomeBand === '2.5l_to_5l') {
      mongoQuery['eligibilityRules.incomeMax'] = { $gte: 500000 };
    }
  }

  const freeText = params.query?.trim();

  let items: any[];
  let total: number;

  if (freeText) {
    // ---- Hybrid retrieval -------------------------------------------
    // Two arms over the same filtered candidate set: the MongoDB text
    // index for keyword precision, and vector similarity for phrasing the
    // keywords miss. Their ranks are fused with RRF.
    const [keywordHits, semanticHits] = await Promise.all([
      SchemeModel.find(
        { ...mongoQuery, $text: { $search: freeText } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(100)
        .lean(),
      semanticSearch(freeText, 100)
    ]);

    const keywordRanking = keywordHits.map((d: any) => String(d._id));
    const semanticRanking = semanticHits.map((h) => h.schemeId);

    // Keyword is weighted a little higher: when a citizen types a scheme's
    // actual name, an exact match should not be out-voted by a neighbour.
    const fused = reciprocalRankFusion([keywordRanking, semanticRanking], [1.0, 0.8]);

    // The semantic arm searches the whole register, so anything it surfaced
    // must still be re-checked against the active filters before it counts.
    const semanticOnlyIds = semanticRanking.filter((id) => !keywordRanking.includes(id));
    const admissible = semanticOnlyIds.length
      ? await SchemeModel.find({ ...mongoQuery, _id: { $in: semanticOnlyIds } })
          .select('_id')
          .lean()
      : [];
    const admissibleIds = new Set(admissible.map((d: any) => String(d._id)));
    keywordRanking.forEach((id) => admissibleIds.add(id));

    const orderedIds = [...fused.entries()]
      .filter(([id]) => admissibleIds.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    total = orderedIds.length;

    const pageIds = orderedIds.slice(skip, skip + limit);
    const docs = await SchemeModel.find({ _id: { $in: pageIds } }).lean();
    const byId = new Map(docs.map((d: any) => [String(d._id), d]));
    items = pageIds.map((id) => byId.get(id)).filter(Boolean);
  } else {
    // ---- Browse: filters only, newest first --------------------------
    [items, total] = await Promise.all([
      SchemeModel.find(mongoQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SchemeModel.countDocuments(mongoQuery)
    ]);
  }

  // Profile relevance boosting if logged-in user context available
  let rankedItems = items as unknown as Scheme[];
  if (params.userId) {
    const profile = await CitizenProfileModel.findOne({ userId: params.userId }).lean();
    if (profile) {
      const userState = (profile as any).currentState || profile.state;
      rankedItems = rankedItems.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (userState && a.state === userState) scoreA += 5;
        if (userState && b.state === userState) scoreB += 5;
        if (profile.occupationCategory && a.targetSegments?.includes(profile.occupationCategory)) scoreA += 5;
        if (profile.occupationCategory && b.targetSegments?.includes(profile.occupationCategory)) scoreB += 5;
        return scoreB - scoreA;
      });
    }
  }

  return {
    schemes: rankedItems.map((s) => localiseScheme(s, params.lang)),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
}

/**
 * Live category aggregation counts
 */
export async function getCategoryCounts(): Promise<CategorySummary> {
  const schemes = await SchemeModel.find({}).lean();

  const summary: CategorySummary = {
    segments: {},
    benefitTypes: {},
    levels: {},
    states: {}
  };

  for (const s of schemes) {
    // Segments
    if (s.targetSegments) {
      for (const seg of s.targetSegments) {
        summary.segments[seg] = (summary.segments[seg] || 0) + 1;
      }
    }
    // Benefit types
    if (s.benefitType) {
      summary.benefitTypes[s.benefitType] = (summary.benefitTypes[s.benefitType] || 0) + 1;
    }
    // Levels
    if (s.level) {
      summary.levels[s.level] = (summary.levels[s.level] || 0) + 1;
    }
    // States
    if (s.state) {
      summary.states[s.state] = (summary.states[s.state] || 0) + 1;
    }
  }

  return summary;
}

/**
 * Fetch scheme by slug or ObjectId
 */
export async function getSchemeBySlugOrId(
  idOrSlug: string,
  lang?: string
): Promise<Scheme | null> {
  let scheme = await SchemeModel.findOne({ slug: idOrSlug }).lean();
  if (!scheme && idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    scheme = await SchemeModel.findById(idOrSlug).lean();
  }
  if (!scheme) return null;
  return localiseScheme(scheme as unknown as Scheme, lang);
}
