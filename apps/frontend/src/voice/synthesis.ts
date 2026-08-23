import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { isNative } from '../native/platform';
import { speechLocale } from './speechLocales';

/**
 * Text to speech — the half of the voice feature that matters most.
 *
 * Speech *input* is a convenience; being read to is the difference between
 * an app a non-reader can use and one they cannot. Two layers: the native
 * engine on a phone, `speechSynthesis` in a browser. Both are offline on
 * most devices, which is the point — a citizen on a patchy connection can
 * still have the question read to them.
 *
 * Nothing here ever speaks on its own. Every call originates in a tap on a
 * speaker button, so the app never starts talking in a shared room.
 */

let webUtterance: SpeechSynthesisUtterance | null = null;

const webSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

let nativeSupported: boolean | null = null;

async function nativeAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  if (nativeSupported !== null) return nativeSupported;
  try {
    await TextToSpeech.getSupportedLanguages();
    nativeSupported = true;
  } catch {
    nativeSupported = false;
  }
  return nativeSupported;
}

/** Whether anything on this device can read text aloud. */
export async function isSpeechAvailable(): Promise<boolean> {
  return (await nativeAvailable()) || webSupported();
}

/** Stop whatever is currently being read. Safe to call when nothing is. */
export async function stopSpeaking(): Promise<void> {
  if (isNative()) {
    await TextToSpeech.stop().catch(() => undefined);
  }
  if (webSupported()) {
    window.speechSynthesis.cancel();
  }
  webUtterance = null;
}

export interface SpeakOptions {
  /** App language code (`hi`, `kn`…). */
  language: string;
  /** Called when playback finishes or is stopped. */
  onEnd?: () => void;
}

/**
 * Read `text` aloud. Any speech already in progress is stopped first —
 * two voices at once is never what anyone wanted.
 */
export async function speak(text: string, { language, onEnd }: SpeakOptions): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  await stopSpeaking();
  const locale = speechLocale(language);

  if (await nativeAvailable()) {
    try {
      // Resolves when the utterance finishes, so `onEnd` can reset the
      // button back from "Stop" to "Read aloud".
      await TextToSpeech.speak({
        text: trimmed,
        lang: locale,
        // Slightly under natural pace: this is administrative wording being
        // read to someone who may be hearing the terms for the first time.
        rate: 0.95,
        pitch: 1,
        volume: 1
      });
      onEnd?.();
      return;
    } catch {
      // Fall through to the web engine rather than failing silently.
    }
  }

  if (!webSupported()) {
    onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = locale;
  utterance.rate = 0.95;

  /*
   * Pick a voice that actually speaks this language where one exists.
   * Without this, Chrome reads Devanagari with an English voice, which is
   * unintelligible. If no matching voice is installed we still speak — a
   * mispronounced reading is more useful than silence — but the caller has
   * already checked availability, so this is the uncommon path.
   */
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.find((v) => v.lang === locale);
  const sameLanguage = voices.find((v) => v.lang?.split('-')[0] === locale.split('-')[0]);
  const chosen = exact ?? sameLanguage;
  if (chosen) utterance.voice = chosen;

  utterance.onend = () => {
    webUtterance = null;
    onEnd?.();
  };
  utterance.onerror = () => {
    webUtterance = null;
    onEnd?.();
  };

  webUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}
