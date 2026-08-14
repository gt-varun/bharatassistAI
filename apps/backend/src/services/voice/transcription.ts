import { logger } from '../../utils/logger.js';

/**
 * Server-side speech-to-text.
 *
 * This is the *fallback* half of the voice input stack. A phone that can
 * recognise speech itself always should: it is free, it works on a weak
 * connection, and the audio never leaves the device. But Android's WebView
 * exposes no Web Speech API, older devices ship poor Indic language packs,
 * and desktop Firefox has nothing at all — so when the device cannot do it,
 * the recording comes here instead.
 *
 * Groq is used because the project already depends on it for chat (see
 * services/ai/), so a deployment that can answer questions can also hear
 * them, with no additional account to create.
 */

const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

/** Whisper large v3 turbo: fast, and strong across the Indian languages. */
const MODEL = 'whisper-large-v3-turbo';

export class TranscriptionUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptionUnavailableError';
  }
}

export const isTranscriptionConfigured = (): boolean => Boolean(process.env.GROQ_API_KEY);

export interface TranscribeOptions {
  /** Locale code as the app uses it (`hi`, `kn`, `ur`…). */
  language?: string;
  /** MIME type the browser recorded in, e.g. `audio/webm`. */
  mimeType?: string;
}

/**
 * Turn recorded audio into text. Throws `TranscriptionUnavailableError` when
 * the server has no key, which the route reports as a plain 503 rather than
 * an error — a deployment without voice is a valid deployment.
 */
export async function transcribeAudio(
  audio: Buffer,
  { language, mimeType = 'audio/webm' }: TranscribeOptions = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new TranscriptionUnavailableError(
      'Speech recognition is not configured on the server. Set GROQ_API_KEY to enable it.'
    );
  }

  // Whisper identifies the container from the filename as well as the part's
  // content type, so the extension has to agree with what was recorded.
  const extension = mimeType.includes('mp4')
    ? 'mp4'
    : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('wav')
        ? 'wav'
        : 'webm';

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), `speech.${extension}`);
  form.append('model', MODEL);
  form.append('response_format', 'json');
  // Naming the language markedly improves accuracy and stops Whisper
  // "helpfully" translating an Indian language into English.
  if (language) form.append('language', language);

  const response = await fetch(GROQ_TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.warn(
      { status: response.status, body: body.slice(0, 300) },
      'Groq transcription request failed'
    );
    throw new Error(`Transcription provider returned ${response.status}`);
  }

  const payload = (await response.json()) as { text?: string };
  return (payload.text ?? '').trim();
}
