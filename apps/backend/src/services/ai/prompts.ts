/**
 * Prompt versions, tracked like code.
 *
 * The prompt text itself still lives next to the logic that builds it
 * (conversationService.ts, extractor.ts) — colocating the *content* of a
 * prompt with the code that assembles its dynamic parts is what keeps them
 * from drifting apart. What lives here is the version tag: every call
 * through the AI Gateway logs which version answered, so a prompt
 * regression is visible in the logs the same way a bad deploy is, and
 * "roll back the prompt" means the same thing "roll back a commit" always
 * has — git history on this constant, not a runtime prompt database that
 * would be its own thing to build and operate at a scale this project
 * doesn't have yet.
 *
 * Bump the version string whenever the *meaning* of a prompt changes
 * (a new constraint, a materially different framing) — not for whitespace.
 */
export const ASSISTANT_PROMPT_VERSION = 'assistant-v1';
export const EXTRACTION_PROMPT_VERSION = 'extraction-v1';
