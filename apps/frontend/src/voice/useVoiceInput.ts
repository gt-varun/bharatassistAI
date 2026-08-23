import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  detectRecognitionMode,
  listen,
  MicrophoneDeniedError,
  type ListenSession,
  type RecognitionMode
} from './recognition';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

interface UseVoiceInputOptions {
  /** Called once with the final transcript. Not called for an empty result. */
  onResult: (text: string) => void;
}

/**
 * Microphone state for one control.
 *
 * The component using this only has to render four states and call
 * `toggle()`; which of the three recognition layers is doing the work, and
 * whether this device has any of them, is decided here.
 */
export function useVoiceInput({ onResult }: UseVoiceInputOptions) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<VoiceState>('idle');
  const [partial, setPartial] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<RecognitionMode | null>(null);
  const sessionRef = useRef<ListenSession | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Ask once, on mount, so the control can hide itself rather than
    // failing when it is pressed.
    void detectRecognitionMode().then((detected) => {
      if (mountedRef.current) setMode(detected);
    });
    return () => {
      mountedRef.current = false;
      sessionRef.current?.stop();
    };
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    setError('');
    setPartial('');
    setState('listening');

    try {
      const session = await listen({
        language: i18n.language,
        onPartial: (text) => mountedRef.current && setPartial(text),
        onProcessing: () => mountedRef.current && setState('processing')
      });
      sessionRef.current = session;

      const text = await session.result;
      sessionRef.current = null;
      if (!mountedRef.current) return;

      setPartial('');
      if (text) {
        setState('idle');
        onResult(text);
      } else {
        // Heard nothing usable. Say so plainly and stay ready to retry.
        setState('error');
        setError(t('voice.notHeard'));
      }
    } catch (err) {
      sessionRef.current = null;
      if (!mountedRef.current) return;
      setState('error');
      setError(err instanceof MicrophoneDeniedError ? t('voice.micDenied') : t('voice.notHeard'));
    }
  }, [i18n.language, onResult, t]);

  const toggle = useCallback(() => {
    if (state === 'listening') stop();
    else if (state !== 'processing') void start();
  }, [state, start, stop]);

  return {
    /** null while still being determined; 'none' means: render no microphone. */
    mode,
    supported: mode !== null && mode !== 'none',
    state,
    partial,
    error,
    toggle,
    stop
  };
}
