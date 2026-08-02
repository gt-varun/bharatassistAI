import { SchemeModel } from '../../models/Scheme.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { generateEmbedding } from './geminiClient.js';
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
 * Extracts structured filter hints from free text query
 */
function extractFiltersFromQuery(queryStr: string): Partial<SearchParams> {
  const hints: Partial<SearchParams> = {};
  const lower = queryStr.toLowerCase();

  // Segments
  if (lower.includes('student') || lower.includes('scholarship')) hints.segment = 'student';
  else if (lower.includes('farmer') || lower.includes('agriculture') || lower.includes('kisan')) hints.segment = 'farmer';
  else if (lower.includes('women') || lower.includes('female') || lower.includes('girl')) hints.segment = 'women';
  else if (lower.includes('senior') || lower.includes('pension') || lower.includes('old age')) hints.segment = 'senior';
  else if (lower.includes('msme') || lower.includes('business') || lower.includes('loan')) hints.segment = 'msme';

  // Level & States
  if (lower.includes('karnataka')) hints.state = 'Karnataka';
  else if (lower.includes('delhi')) hints.state = 'Delhi';
  else if (lower.includes('maharashtra')) hints.state = 'Maharashtra';
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

  // Text search ranking vs default sort
  let sortOption: Record<string, any> = { createdAt: -1 };
  if (params.query && params.query.trim()) {
    mongoQuery.$text = { $search: params.query.trim() };
    sortOption = { score: { $meta: 'textScore' } };
  }

  // Fetch count & items
  const [items, total] = await Promise.all([
    SchemeModel.find(mongoQuery, params.query ? { score: { $meta: 'textScore' } } : {})
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    SchemeModel.countDocuments(mongoQuery)
  ]);

  // Profile relevance boosting if logged-in user context available
  let rankedItems = items as unknown as Scheme[];
  if (params.userId) {
    const profile = await CitizenProfileModel.findOne({ userId: params.userId }).lean();
    if (profile) {
      rankedItems = rankedItems.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (profile.state && a.state === profile.state) scoreA += 5;
        if (profile.state && b.state === profile.state) scoreB += 5;
        if (profile.occupationCategory && a.targetSegments?.includes(profile.occupationCategory)) scoreA += 5;
        if (profile.occupationCategory && b.targetSegments?.includes(profile.occupationCategory)) scoreB += 5;
        return scoreB - scoreA;
      });
    }
  }

  return {
    schemes: rankedItems,
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
export async function getSchemeBySlugOrId(idOrSlug: string): Promise<Scheme | null> {
  let scheme = await SchemeModel.findOne({ slug: idOrSlug }).lean();
  if (!scheme && idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    scheme = await SchemeModel.findById(idOrSlug).lean();
  }
  return scheme as unknown as Scheme | null;
}
