/**
 * Deterministic intent classification for the AI Assistant.
 *
 * A keyword/pattern classifier rather than an LLM call, on purpose: it is
 * free, instant, and unit-testable, and its only job is to shape *how* the
 * retrieval query and system prompt are built — never to decide facts. Intent
 * never gates whether the assistant is allowed to answer; it only changes the
 * framing of the Gemini call in `conversationService.ts`.
 */

export type AssistantIntent =
  | 'recommend'
  | 'explain'
  | 'compare'
  | 'application_help'
  | 'faq'
  | 'general';

interface IntentPattern {
  intent: AssistantIntent;
  patterns: RegExp[];
}

// Order matters: checked top to bottom, first match wins. More specific
// intents (compare, application_help) are checked before the broader
// recommend/explain buckets so "compare X and Y" doesn't fall into "explain".
const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'compare',
    patterns: [
      /\bcompare\b/i,
      /\bdifference between\b/i,
      /\bwhich (?:is|one) (?:better|best)\b/i,
      /\bvs\.?\b/i,
      /\bया\b.*\bबेहतर\b/ // Hindi: "...or... better"
    ]
  },
  {
    intent: 'application_help',
    patterns: [
      /\bhow (?:do|can) i apply\b/i,
      /\bapplication form\b/i,
      /\bhow to fill\b/i,
      /\bwhat documents? (?:do i need|are required)\b/i,
      /\bapply\b/i,
      /आवेदन/,
      /दस्तावेज़/
    ]
  },
  {
    intent: 'recommend',
    patterns: [
      /\bwhich schemes?\b/i,
      /\bwhat schemes?\b/i,
      /\bam i eligible for\b/i,
      /\bschemes? for\b/i,
      /\bcan i (?:get|claim|apply for)\b/i,
      /\bsuggest\b/i,
      /\brecommend\b/i,
      /कौन(?:सी|-सी)? योजना/,
      /योजना.*सुझाइए/
    ]
  },
  {
    intent: 'explain',
    patterns: [
      /\bwhat does .* mean\b/i,
      /\bwhat is (?:a|an)?\b.*\bcertificate\b/i,
      /\bexplain\b/i,
      /\bmeaning of\b/i,
      /\bदा?क्या.*मतलब/,
      /समझाइए/
    ]
  },
  {
    intent: 'faq',
    patterns: [/\bwhy\b/i, /\bwhen\b/i, /\bhow long\b/i, /\bdeadline\b/i, /क्यों/, /कब/]
  }
];

/** Classifies a citizen's message into a coarse intent bucket. */
export function classifyIntent(message: string): AssistantIntent {
  const trimmed = (message || '').trim();
  if (!trimmed) return 'general';

  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(trimmed))) return intent;
  }

  return 'general';
}

/** Short, human-readable framing injected into the system prompt per intent. */
export function intentFraming(intent: AssistantIntent): string {
  switch (intent) {
    case 'recommend':
      return 'The citizen is looking for schemes that match their situation. Recommend only schemes present in the retrieved context, and say which of their stated details (state, occupation, income, etc.) matched.';
    case 'explain':
      return 'The citizen wants a term, rule, or scheme explained in plain language. Avoid bureaucratic wording; define any government term you have to use.';
    case 'compare':
      return 'The citizen wants two or more schemes compared. Use only the retrieved schemes, and structure the answer around concrete differences (benefit, eligibility, documents, deadline) rather than a vague preference.';
    case 'application_help':
      return 'The citizen wants help with the application process or documents. Point them to the specific required documents and application fields in the retrieved context, and mention that the Application Guidance and Document Checklist pages walk through this step by step.';
    case 'faq':
      return 'Answer the general question using only the retrieved context.';
    default:
      return 'Answer helpfully using only the retrieved context.';
  }
}
