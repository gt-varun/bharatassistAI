import type { Scheme, ConversationMessage, CitizenProfile } from '@bharatassist/shared-types';
import { ConversationModel } from '../../models/Conversation.js';
import { CitizenProfileModel } from '../../models/CitizenProfile.js';
import { searchSchemes, getSchemeBySlugOrId } from '../ai/retrievalService.js';
import { callAI, buildCacheKey } from '../ai/aiGateway.js';
import { ASSISTANT_PROMPT_VERSION } from '../ai/prompts.js';
import { classifyIntent, intentFraming, type AssistantIntent } from './intentClassifier.js';
import { logger } from '../../utils/logger.js';

/**
 * The RAG pipeline behind POST /api/assistant/message.
 *
 * The non-negotiable shape (docs/rules.md #16-17): retrieve first, ground the
 * model in only what retrieval returned, and log which scheme records every
 * fact-shaped answer came from. If retrieval finds nothing, the model is
 * never called at all — there is no code path where the assistant can
 * improvise a plausible-sounding answer over an empty result set.
 *
 * Calls go through the AI Gateway (services/ai/aiGateway.ts), not
 * geminiClient.ts directly — that's what attaches prompt-version tagging,
 * response caching, and explainability metadata without this file having
 * to reinvent any of it.
 */

const MAX_CONTEXT_SCHEMES = 5;
const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;

const NO_MATCH_TEXT =
  "I couldn't find a scheme on the register that matches this. Try adding your state, occupation, or " +
  'the kind of help you need, or search the register directly. I only answer from verified scheme records, ' +
  'so I will not guess at one.';

const MODEL_UNAVAILABLE_TEXT =
  "The assistant couldn't reach the language model just now. The records it would have drawn from are " +
  'linked below — open them directly, or try again in a moment.';

export interface AssistantMessageInput {
  message: string;
  /** Optional scheme slug/id the conversation is scoped to (e.g. arrived via "Explain this simpler"). */
  schemeId?: string;
  /** Continue an existing conversation; omitted or unrecognised starts a new one. */
  conversationId?: string;
  /** Absent for a guest — guest turns are answered but never persisted. */
  userId?: string;
  language?: string;
}

export interface AssistantSourceRef {
  id: string;
  slug: string;
  name: string;
}

/**
 * Debugging/audit metadata about how this specific turn was answered — not
 * persisted to `conversations` (that shape is frozen per
 * docs/scheme-database.md §8), only returned on the live API response.
 */
export interface AssistantExplainability {
  provider: 'groq' | 'gemini' | 'offline';
  model: string;
  promptVersion: string;
  retrievedChunks: number;
  latencyMs: number;
  cacheHit: boolean;
  generatedAt: string;
}

export interface AssistantMessageOutput {
  conversationId: string | null;
  content: string;
  sourceSchemeIds: string[];
  sources: AssistantSourceRef[];
  noMatch: boolean;
  intent: AssistantIntent;
  /** Absent for the empty-retrieval short-circuit — there was no model call to explain. */
  explainability?: AssistantExplainability;
}

function formatSchemeForContext(scheme: Scheme): string {
  const lines = [
    `Scheme: ${scheme.name}`,
    `Department: ${scheme.department}`,
    `Level: ${scheme.level}${scheme.state ? ` (${scheme.state})` : ' (central, all states)'}`,
    `Benefit: ${scheme.benefitSummary}`,
    `Eligibility summary: ${scheme.eligibilitySummaryPlain}`,
    `Status: ${scheme.status}`
  ];
  if (scheme.requiredDocuments?.length) {
    lines.push(`Required documents: ${scheme.requiredDocuments.map((d) => d.label).join(', ')}`);
  }
  if (scheme.deadline) {
    lines.push(`Deadline: ${new Date(scheme.deadline).toDateString()}`);
  }
  lines.push(`Official portal: ${scheme.officialPortalUrl}`);
  return lines.join('\n');
}

type ProfileContextFields = Pick<
  CitizenProfile,
  'state' | 'age' | 'gender' | 'occupationCategory' | 'incomeBand' | 'category' | 'disabilityStatus'
>;

/**
 * A short, factual line about the citizen's own profile — supplementary
 * personalization only. The system instruction is explicit that this never
 * substitutes for the Eligibility Checker's determination (docs/rules.md
 * #18 still applies to every word the model produces from this).
 */
export function buildProfileContext(profile: Partial<ProfileContextFields> | null | undefined): string | null {
  if (!profile) return null;
  const parts: string[] = [];
  if (profile.state) parts.push(`state: ${profile.state}`);
  if (profile.occupationCategory) parts.push(`occupation: ${profile.occupationCategory}`);
  if (typeof profile.age === 'number') parts.push(`age: ${profile.age}`);
  if (profile.gender) parts.push(`gender: ${profile.gender}`);
  if (profile.incomeBand) parts.push(`income band: ${profile.incomeBand}`);
  if (profile.category) parts.push(`social category: ${profile.category}`);
  if (profile.disabilityStatus) parts.push('has a recorded disability status');

  if (!parts.length) return null;
  return (
    'Citizen profile on file (use only to phrase the answer more specifically to their situation — ' +
    `never to declare eligibility yourself): ${parts.join(', ')}.`
  );
}

function buildSystemInstruction(intent: AssistantIntent, language: string): string {
  return [
    'You are BharatAssist AI, a grounded assistant for Indian government scheme discovery. Follow these rules without exception:',
    '1. State only facts that appear in the "Retrieved scheme records" context you are given. Never invent a scheme name, eligibility rule, benefit amount, document, or deadline.',
    "2. You never calculate or declare whether the citizen is eligible for a scheme. Explain the eligibility criteria from the record, then tell them to use that scheme's Eligibility Checker for an official Eligible / Partially Eligible / Not Eligible result.",
    '3. When you name a scheme, use its exact name as given in the retrieved records.',
    `4. Reply in this language: ${language}.`,
    '5. Keep the answer concise and in plain language. Define any government term you have to use.',
    '6. If a citizen profile is included in the context, you may use it to make your phrasing more specific to their situation — it never changes rule 2.',
    intentFraming(intent)
  ].join('\n');
}

/**
 * Runs the full grounded pipeline for one citizen message and returns the
 * assistant's reply. Persists the turn to `conversations` only when a
 * `userId` is present — guest sessions stay ephemeral per docs/prd.md §11.10.
 */
export async function handleAssistantMessage(
  input: AssistantMessageInput
): Promise<AssistantMessageOutput> {
  const { message, schemeId, userId, language = 'en' } = input;
  const intent = classifyIntent(message);

  const collected: Scheme[] = [];
  const seen = new Set<string>();
  const pushUnique = (scheme?: Scheme | null) => {
    if (!scheme) return;
    const key = String(scheme._id || scheme.slug);
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(scheme);
  };

  // A scheme the conversation is scoped to (e.g. "Explain this simpler" from
  // a Scheme Details page) always anchors the context, ahead of whatever
  // broader retrieval turns up.
  if (schemeId) {
    try {
      pushUnique(await getSchemeBySlugOrId(schemeId, language));
    } catch (err) {
      logger.warn({ err, schemeId }, 'Could not load the scoped scheme for the assistant');
    }
  }

  try {
    const { schemes } = await searchSchemes({
      query: message,
      lang: language,
      userId,
      limit: MAX_CONTEXT_SCHEMES
    });
    schemes.forEach(pushUnique);
  } catch (err) {
    logger.error({ err }, 'Assistant retrieval failed; continuing with any scoped scheme only.');
  }

  const contextSchemes = collected.slice(0, MAX_CONTEXT_SCHEMES);
  const sourceSchemeIds = contextSchemes.map((s) => String(s._id));
  const sources: AssistantSourceRef[] = contextSchemes.map((s) => ({
    id: String(s._id),
    slug: s.slug,
    name: s.name
  }));

  // Profile-aware context: a citizen's own state/occupation/income makes
  // the assistant's phrasing more specific without letting it decide
  // eligibility (rule 2 in the system instruction stays absolute).
  let profileContext: string | null = null;
  if (userId) {
    try {
      const profile = await CitizenProfileModel.findOne({ userId }).lean();
      profileContext = buildProfileContext(profile);
    } catch (err) {
      logger.warn({ err, userId }, 'Could not load citizen profile for assistant context');
    }
  }

  let content: string;
  let noMatch = false;
  let explainability: AssistantExplainability | undefined;

  if (contextSchemes.length === 0) {
    // The empty-retrieval short-circuit: the model is not called at all, so
    // there is no way for this turn to end in an invented answer.
    noMatch = true;
    content = NO_MATCH_TEXT;
  } else {
    const schemeContext = contextSchemes.map(formatSchemeForContext).join('\n\n---\n\n');
    const context = profileContext ? `${profileContext}\n\n${schemeContext}` : schemeContext;
    const systemInstruction = buildSystemInstruction(intent, language);

    // The cache key includes the full context (schemes + profile), not just
    // the raw message — two citizens asking the same words but grounded in
    // different retrieved schemes or different profiles must never share a
    // cached answer.
    const cacheKey = buildCacheKey([systemInstruction, message, context]);

    try {
      const result = await callAI({
        caller: 'assistant',
        promptVersion: ASSISTANT_PROMPT_VERSION,
        prompt: message,
        context,
        systemInstruction,
        cacheKey,
        cacheTtlMs: RESPONSE_CACHE_TTL_MS
      });

      content = result.text?.trim() || NO_MATCH_TEXT;
      explainability = {
        provider: result.provider,
        model: result.model,
        promptVersion: result.promptVersion,
        retrievedChunks: contextSchemes.length,
        latencyMs: result.latencyMs,
        cacheHit: result.cacheHit,
        generatedAt: result.generatedAt
      };
    } catch (err) {
      logger.error({ err }, 'AI Gateway call failed for an assistant message');
      content = MODEL_UNAVAILABLE_TEXT;
    }
  }

  let conversationId: string | null = null;
  if (userId) {
    conversationId = await persistTurn({
      userId,
      conversationId: input.conversationId,
      language,
      userMessage: message,
      assistantContent: content,
      sourceSchemeIds
    });
  }

  return { conversationId, content, sourceSchemeIds, sources, noMatch, intent, explainability };
}

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

async function persistTurn(opts: {
  userId: string;
  conversationId?: string;
  language: string;
  userMessage: string;
  assistantContent: string;
  sourceSchemeIds: string[];
}): Promise<string> {
  const { userId, conversationId, language, userMessage, assistantContent, sourceSchemeIds } = opts;

  const userMsg: ConversationMessage = { role: 'user', content: userMessage, timestamp: new Date() };
  const assistantMsg: ConversationMessage = {
    role: 'assistant',
    content: assistantContent,
    timestamp: new Date(),
    sourceSchemeIds
  };

  if (conversationId && OBJECT_ID_RE.test(conversationId)) {
    const updated = await ConversationModel.findOneAndUpdate(
      { _id: conversationId, userId },
      { $push: { messages: { $each: [userMsg, assistantMsg] } }, $set: { language } },
      { new: true }
    ).lean();
    if (updated) return String(updated._id);
  }

  const created = await ConversationModel.create({
    userId,
    messages: [userMsg, assistantMsg],
    language
  });
  return String(created._id);
}

export interface ConversationSummary {
  _id: string;
  language: string;
  updatedAt: Date;
  messageCount: number;
  preview: string;
}

/** Summaries for the conversation list — most recently active first. */
export async function listConversations(userId: string, limit = 20): Promise<ConversationSummary[]> {
  const conversations = await ConversationModel.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(Math.min(50, Math.max(1, limit)))
    .lean();

  return conversations.map((c: any) => ({
    _id: String(c._id),
    language: c.language,
    updatedAt: c.updatedAt,
    messageCount: c.messages?.length ?? 0,
    preview: (c.messages?.[c.messages.length - 1]?.content ?? '').slice(0, 140)
  }));
}

/** Full message history for one conversation — only ever the owner's. */
export async function getConversationById(userId: string, id: string) {
  if (!OBJECT_ID_RE.test(id)) return null;
  const conversation = await ConversationModel.findOne({ _id: id, userId }).lean();
  if (!conversation) return null;
  return {
    _id: String(conversation._id),
    language: conversation.language,
    updatedAt: (conversation as any).updatedAt,
    messages: conversation.messages
  };
}
