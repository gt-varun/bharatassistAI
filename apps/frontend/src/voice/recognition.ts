import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { apiClient } from '../api/client';
import { isNative } from '../native/platform';
import { speechLocale, whisperLanguage } from './speechLocales';

/**
 * Speech to text, in three layers.
 *
 * A citizen who cannot read still has to be able to answer "which state do
 * you live in?", so this has to work on the widest possible set of devices —
 * and no single technique covers them. In descending order of preference:
 *
 *   1. `native`  — the phone's own recogniser, via the Capacitor plugin.
 *                  Free, fast, often works with a weak connection, and the
 *                  audio never leaves the handset. Always preferred.
 *   2. `web`     — the Web Speech API. Chrome and Edge on the desktop, and
 *                  Safari. Absent from Android's WebView and from Firefox.
 *   3. `server`  — record with MediaRecorder and send the clip to the API,
 *                  which passes it to Whisper. Works anywhere a microphone
 *                  and a connection exist, and is the only option inside an
 *                  Android WebView. Costs a request, so it goes last.
 *
 * Callers never choose: they ask `detectRecognitionMode()` whether *any*
 * layer is available and then call `listen()`. If the answer is `none`, the
 * microphone button is not rendered at all — a dead control is worse than
 * no control.
 */

export type RecognitionMode = 'native' | 'web' | 'server' | 'none';

export class MicrophoneDeniedError extends Error {
  constructor() {
    super('Microphone permission was refused.');
    this.name = 'MicrophoneDeniedError';
  }
}

type SpeechRecognitionCtor = new () => any;

const webSpeechCtor = (): SpeechRecognitionCtor | undefined =>
  (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

let serverCapable: boolean | null = null;

/** Whether the API has a transcription provider configured. Asked once. */
async function serverTranscriptionAvailable(): Promise<boolean> {
  if (serverCapable !== null) return serverCapable;
  try {
    const res = await apiClient.get('/voice/capabilities');
    serverCapable = Boolean(res.data?.data?.transcription);
  } catch {
    serverCapable = false;
  }
  return serverCapable;
}

const canRecord = (): boolean =>
  typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * Which layer this device can actually use. Called before showing a mic.
 */
export async function detectRecognitionMode(): Promise<RecognitionMode> {
  if (isNative()) {
    try {
      const { available } = await SpeechRecognition.available();
      if (available) return 'native';
    } catch {
      /* Plugin missing or unsupported OS version — fall through. */
    }
  }

  if (webSpeechCtor()) return 'web';

  if (canRecord() && (await serverTranscriptionAvailable())) return 'server';

  return 'none';
}

export interface ListenOptions {
  /** App language code (`hi`, `kn`…). */
  language: string;
  /** Called with words as they are recognised, where the layer supports it. */
  onPartial?: (text: string) => void;
  /** Called once recording stops and the text is being worked out. */
  onProcessing?: () => void;
}

export interface ListenSession {
  /** Resolves with the final transcript — empty string if nothing was heard. */
  result: Promise<string>;
  /** Stop early and settle with whatever has been heard so far. */
  stop: () => void;
}

/* ------------------------------------------------------------------ *
 * 1. Native
 * ------------------------------------------------------------------ */

async function listenNative({ language, onPartial }: ListenOptions): Promise<ListenSession> {
  const permission = await SpeechRecognition.checkPermissions();
  if (permission.speechRecognition !== 'granted') {
    const asked = await SpeechRecognition.requestPermissions();
    if (asked.speechRecognition !== 'granted') throw new MicrophoneDeniedError();
  }

  let settle: (text: string) => void;
  const result = new Promise<string>((resolve) => {
    settle = resolve;
  });

  let latest = '';
  const listener = await SpeechRecognition.addListener('partialResults', (data: any) => {
    const text = data?.matches?.[0] ?? '';
    if (text) {
      latest = text;
      onPartial?.(text);
    }
  });

  const finish = async () => {
    await listener.remove().catch(() => undefined);
    settle(latest.trim());
  };

  void SpeechRecognition.start({
    language: speechLocale(language),
    maxResults: 1,
    partialResults: true,
    // The system dialog would cover our own question, and it is not
    // translated into the language the citizen is reading in.
    popup: false
  })
    .then((res: any) => {
      const finalText = res?.matches?.[0];
      if (finalText) latest = finalText;
      void finish();
    })
    .catch(() => void finish());

  return {
    result,
    stop: () => {
      void SpeechRecognition.stop().catch(() => undefined);
    }
  };
}

/* ------------------------------------------------------------------ *
 * 2. Web Speech API
 * ------------------------------------------------------------------ */

function listenWeb({ language, onPartial }: ListenOptions): ListenSession {
  const Ctor = webSpeechCtor()!;
  const recogniser = new Ctor();
  recogniser.lang = speechLocale(language);
  recogniser.interimResults = true;
  recogniser.continuous = false;
  recogniser.maxAlternatives = 1;

  let latest = '';
  let settle: (text: string) => void;
  let fail: (error: Error) => void;
  const result = new Promise<string>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });

  recogniser.onresult = (event: any) => {
    let text = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      text += event.results[i][0].transcript;
    }
    latest = text;
    onPartial?.(text);
  };
  recogniser.onerror = (event: any) => {
    if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
      fail(new MicrophoneDeniedError());
      return;
    }
    // "no-speech" and friends are ordinary outcomes, not failures.
    settle(latest.trim());
  };
  recogniser.onend = () => settle(latest.trim());

  recogniser.start();

  return { result, stop: () => recogniser.stop() };
}

/* ------------------------------------------------------------------ *
 * 3. Server (Whisper)
 * ------------------------------------------------------------------ */

async function listenServer({ language, onProcessing }: ListenOptions): Promise<ListenSession> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new MicrophoneDeniedError();
  }

  // Let the browser pick a container it can actually produce; Whisper reads
  // all of these, and Safari differs from Chrome here.
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(
    (type) => MediaRecorder.isTypeSupported?.(type)
  );

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const result = new Promise<string>((resolve) => {
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      onProcessing?.();

      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size === 0) return resolve('');

      try {
        const res = await apiClient.post('/voice/transcribe', blob, {
          headers: { 'Content-Type': blob.type },
          params: { lang: whisperLanguage(language) }
        });
        resolve((res.data?.data?.text ?? '').trim());
      } catch {
        // A failed transcription is "I did not catch that", not a crash.
        resolve('');
      }
    };
  });

  recorder.start();

  return {
    result,
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop();
    }
  };
}

/* ------------------------------------------------------------------ */

/**
 * Start listening using the best layer this device has.
 *
 * Throws `MicrophoneDeniedError` when permission is refused — the only
 * failure worth telling the citizen about, because it is the only one they
 * can do something about.
 */
export async function listen(options: ListenOptions): Promise<ListenSession> {
  const mode = await detectRecognitionMode();

  switch (mode) {
    case 'native':
      return listenNative(options);
    case 'web':
      return listenWeb(options);
    case 'server':
      return listenServer(options);
    default:
      throw new Error('Speech recognition is not available on this device.');
  }
}
