import { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';
import { isNative } from './platform';

/**
 * Whether the device currently has a connection.
 *
 * The register is a read-mostly product with no offline store, so losing
 * the network is not a state the app can work around — but it is one it
 * must *explain*. Without this, a citizen on a patchy rural connection sees
 * empty result lists and blank record pages and concludes the scheme does
 * not exist.
 *
 * On the web this is `navigator.onLine`, which is what the browser already
 * offered. Inside the app it comes from the OS, which is considerably more
 * truthful than a WebView's own guess.
 */
export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );

  useEffect(() => {
    let cancelled = false;

    if (isNative()) {
      let remove: (() => void) | undefined;

      void Network.getStatus().then((status) => {
        if (!cancelled) setOnline(status.connected);
      });

      void Network.addListener('networkStatusChange', (status) => {
        if (!cancelled) setOnline(status.connected);
      }).then((handle) => {
        if (cancelled) void handle.remove();
        else remove = () => void handle.remove();
      });

      return () => {
        cancelled = true;
        remove?.();
      };
    }

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
