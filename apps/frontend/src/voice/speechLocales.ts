/**
 * App language codes to the BCP-47 tags speech engines expect.
 *
 * The locale files are keyed by bare language (`hi`, `kn`, `ur`), but every
 * speech engine — Android's recogniser, iOS's, the Web Speech API and
 * Whisper alike — wants a region: asking for "ta" gets you nothing, "ta-IN"
 * gets you Tamil. India is the right region for all of these; English is
 * mapped to en-IN too, because the English an Indian citizen speaks to this
 * app is Indian English, and en-US recognisers mishear place names and
 * scheme names constantly.
 */
export const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  pa: 'pa-IN',
  ur: 'ur-IN'
};

/** BCP-47 tag for a speech engine. Falls back to Indian English. */
export const speechLocale = (language: string): string =>
  SPEECH_LOCALES[language?.split('-')[0]] ?? 'en-IN';

/**
 * Whisper takes a bare ISO-639-1 code, not a region tag — passing `hi-IN`
 * makes it fall back to auto-detection, which for short utterances in a
 * noisy room usually guesses English and "translates".
 */
export const whisperLanguage = (language: string): string => language?.split('-')[0] || 'en';
