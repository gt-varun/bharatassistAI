import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSpeechAvailable, speak, stopSpeaking } from './synthesis';

/**
 * Read-aloud state for one piece of text.
 *
 * Speaking always follows a tap, so this exposes a single `toggle` and a
 * `speaking` flag; the button swaps between "Read aloud" and "Stop".
 */
export function useSpeak() {
  const { i18n } = useTranslation();
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void isSpeechAvailable().then((can) => {
      if (mountedRef.current) setSupported(can);
    });
    return () => {
      mountedRef.current = false;
      // Leaving the screen must silence it — otherwise the previous page
      // keeps talking over the new one.
      void stopSpeaking();
    };
  }, []);

  const stop = useCallback(() => {
    void stopSpeaking();
    if (mountedRef.current) setSpeaking(false);
  }, []);

  const say = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setSpeaking(true);
      void speak(text, {
        language: i18n.language,
        onEnd: () => mountedRef.current && setSpeaking(false)
      });
    },
    [i18n.language]
  );

  const toggle = useCallback(
    (text: string) => {
      if (speaking) stop();
      else say(text);
    },
    [speaking, say, stop]
  );

  return { supported: supported === true, speaking, say, stop, toggle };
}
