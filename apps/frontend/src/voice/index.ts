/**
 * The voice feature, as one door.
 *
 * Pages import from here and never from the layer modules — which is what
 * lets speech recognition move between the device, the browser and the
 * server without a single page component changing.
 */
export { MicButton } from './MicButton';
export { SpeakButton } from './SpeakButton';
export { useVoiceInput, type VoiceState } from './useVoiceInput';
export { useSpeak } from './useSpeak';
export { detectRecognitionMode, type RecognitionMode } from './recognition';
export { isSpeechAvailable, speak, stopSpeaking } from './synthesis';
export { speechLocale, SPEECH_LOCALES } from './speechLocales';
