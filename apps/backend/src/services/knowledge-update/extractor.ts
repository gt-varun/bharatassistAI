import { z } from 'zod';
import { callAI } from '../ai/aiGateway.js';
import { EXTRACTION_PROMPT_VERSION } from '../ai/prompts.js';
import { isValidGovDomain } from './govAllowlist.js';
import { logger } from '../../utils/logger.js';

/**
 * The "Extract" step (docs/prd.md §17.6 step 3): turns raw source text into
 * the same structured shape as a `schemes` record, via the AI Gateway
 * (docs/rules.md #14 — this file never calls a model provider directly,
 * and now goes through the same prompt-versioning/logging layer the
 * Assistant does, rather than each caller inventing its own).
 *
 * The model's own JSON is only ever a *candidate*. `scoreExtraction` below
 * recomputes confidence deterministically from the candidate's own
 * completeness and internal consistency — the AI does not get to grade its
 * own homework for whether it's trusted enough to auto-publish
 * (docs/prd.md §9 — the database is the source of truth, not the model).
 */

const additionalConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'in', 'gte', 'lte', 'between', 'not_in']),
  value: z.any()
});

const eligibilityRulesSchema = z
  .object({
    state: z.array(z.string()).optional().default([]),
    ageMin: z.number().nullable().optional().default(null),
    ageMax: z.number().nullable().optional().default(null),
    incomeMax: z.number().nullable().optional().default(null),
    occupationCategory: z.array(z.string()).optional().default([]),
    genderRestriction: z.string().nullable().optional().default(null),
    categoryRestriction: z.array(z.string()).optional().default([]),
    additionalConditions: z.array(additionalConditionSchema).optional().default([])
  })
  .default({});

const requiredDocumentSchema = z.object({
  label: z.string(),
  howToObtain: z.string().optional().default(''),
  mandatory: z.boolean().optional().default(true)
});

const applicationFieldSchema = z.object({
  fieldName: z.string(),
  instructions: z.string().optional().default(''),
  mandatory: z.boolean().optional().default(true)
});

export const extractedSchemeSchema = z.object({
  name: z.string().min(3),
  department: z.string().optional().default(''),
  level: z.enum(['central', 'state']).optional().default('central'),
  state: z.string().nullable().optional().default(null),
  shortDescription: z.string().optional().default(''),
  fullDescription: z.string().optional().default(''),
  targetSegments: z.array(z.string()).optional().default([]),
  benefitType: z.enum(['cash', 'loan', 'subsidy', 'certificate', 'service']).optional().default('service'),
  benefitSummary: z.string().optional().default(''),
  eligibilityRules: eligibilityRulesSchema,
  eligibilitySummaryPlain: z.string().optional().default(''),
  requiredDocuments: z.array(requiredDocumentSchema).optional().default([]),
  applicationMode: z.enum(['online', 'offline', 'both']).optional().default('online'),
  officialPortalUrl: z.string().optional().default(''),
  applicationFields: z.array(applicationFieldSchema).optional().default([]),
  commonMistakes: z.array(z.string()).optional().default([]),
  deadline: z.string().nullable().optional().default(null),
  status: z.enum(['open', 'closed', 'rolling']).optional().default('rolling'),
  /**
   * An explicit reason for a change, only when the source text actually
   * states one (e.g. "per Gazette Notification No. XYZ dated..."). Feeds
   * the version history's `changeReason` — grounded the same way every
   * other extracted fact is, never invented when the source is silent.
   */
  changeContext: z.string().nullable().optional().default(null),
  /** The model's own stated confidence — logged for observability, never trusted as the published score. */
  modelConfidence: z.number().min(0).max(1).optional().default(0.5)
});

export type ExtractedScheme = z.infer<typeof extractedSchemeSchema>;

const EXTRACTION_SYSTEM_INSTRUCTION = `You extract structured government scheme data for BharatAssist AI's Knowledge Update System.

Return ONLY a single JSON object — no prose, no markdown code fences, no commentary before or after it. It must match this exact shape:
{
  "name": string,
  "department": string,
  "level": "central" | "state",
  "state": string | null,
  "shortDescription": string,
  "fullDescription": string,
  "targetSegments": string[] (choose from: student, farmer, women, senior_citizen, pwd, msme, jobseeker, general),
  "benefitType": "cash" | "loan" | "subsidy" | "certificate" | "service",
  "benefitSummary": string,
  "eligibilityRules": {
    "state": string[],
    "ageMin": number | null,
    "ageMax": number | null,
    "incomeMax": number | null,
    "occupationCategory": string[],
    "genderRestriction": string | null,
    "categoryRestriction": string[],
    "additionalConditions": []
  },
  "eligibilitySummaryPlain": string,
  "requiredDocuments": [{ "label": string, "howToObtain": string, "mandatory": boolean }],
  "applicationMode": "online" | "offline" | "both",
  "officialPortalUrl": string,
  "applicationFields": [{ "fieldName": string, "instructions": string, "mandatory": boolean }],
  "commonMistakes": string[],
  "deadline": string (ISO date) | null,
  "status": "open" | "closed" | "rolling",
  "changeContext": string | null — ONLY if the source text explicitly states a reason for a change (a circular/notification number, an effective-date note, "revised from X to Y" wording). Otherwise null. Never guess or infer one.
  "modelConfidence": number between 0 and 1, your own honest estimate of how complete and reliable this extraction is
}

Rules:
1. Use ONLY information present in the source text. If a field is not stated, use an empty string, empty array, or null — never invent a plausible-sounding value.
2. Do not guess at eligibility numbers (age, income) that are not explicitly stated.
3. modelConfidence should be low (below 0.4) if the source text is mostly navigation/boilerplate rather than actual scheme content.`;

/** Strips markdown fences and stray prose, then parses+validates the JSON object inside. */
export function parseExtractionResponse(raw: string): ExtractedScheme | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }

  const result = extractedSchemeSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Deterministic confidence score in [0, 1] from the extraction's own
 * completeness and internal consistency — never from the model's
 * self-report. This is what the pipeline's publish/review-queue decision
 * actually gates on.
 */
export function scoreExtraction(record: ExtractedScheme, sourceUrl: string): number {
  const nonEmpty = (s?: string | null) => Boolean(s && s.trim().length >= 10);
  const rules = record.eligibilityRules ?? {};
  const hasAnyRule = Boolean(
    rules.state?.length ||
      rules.ageMin != null ||
      rules.ageMax != null ||
      rules.incomeMax != null ||
      rules.occupationCategory?.length ||
      rules.genderRestriction ||
      rules.categoryRestriction?.length ||
      rules.additionalConditions?.length
  );
  const ageConsistent = !(rules.ageMin != null && rules.ageMax != null) || rules.ageMin! <= rules.ageMax!;
  const incomeConsistent = rules.incomeMax == null || rules.incomeMax > 0;

  const checks = [
    nonEmpty(record.name),
    nonEmpty(record.shortDescription),
    nonEmpty(record.eligibilitySummaryPlain),
    nonEmpty(record.benefitSummary),
    record.requiredDocuments.length > 0,
    hasAnyRule,
    isValidGovDomain(record.officialPortalUrl) || isValidGovDomain(sourceUrl),
    ageConsistent && incomeConsistent
  ];

  const score = checks.filter(Boolean).length / checks.length;
  return Math.round(score * 100) / 100;
}

export interface ExtractionResult {
  record: ExtractedScheme;
  /** Code-computed — this is the number the pipeline actually acts on. */
  confidence: number;
  /** What the model claimed — logged alongside for observability only. */
  modelConfidence: number;
}

const MIN_SOURCE_LENGTH = 200;
const MAX_PROMPT_CHARS = 12000;

/** Runs one source's text through the extraction model and scores the result. */
export async function extractSchemeFromText(
  sourceText: string,
  sourceUrl: string
): Promise<ExtractionResult | null> {
  if (!sourceText || sourceText.trim().length < MIN_SOURCE_LENGTH) {
    logger.info({ sourceUrl }, 'Knowledge Update: source text too short to extract from');
    return null;
  }

  const completion = await callAI({
    caller: 'knowledge-update-extraction',
    promptVersion: EXTRACTION_PROMPT_VERSION,
    prompt: sourceText.slice(0, MAX_PROMPT_CHARS),
    systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION
    // Deliberately no cacheKey: diffDetector.ts already skips re-extracting
    // unchanged content by content hash upstream of this call, so a second
    // cache here would only ever hit when the content already changed —
    // exactly when a fresh extraction is wanted.
  });

  const record = parseExtractionResponse(completion.text);
  if (!record) {
    logger.warn({ sourceUrl }, 'Knowledge Update: extraction response was not valid structured JSON');
    return null;
  }

  const confidence = scoreExtraction(record, sourceUrl);
  return { record, confidence, modelConfidence: record.modelConfidence };
}
