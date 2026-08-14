import { App } from '@capacitor/app';
import { isNative } from './platform';

/**
 * Android's hardware/gesture back button.
 *
 * The rule Android users expect: back closes whatever is layered on top —
 * a sheet, a drawer, a filter panel — and only when nothing is layered
 * does it go back a page; only when there is no page to go back to does it
 * leave the app.
 *
 * Capacitor delivers one `backButton` event to every listener with no
 * ordering, so a plain `App.addListener` per component would have the
 * drawer and the router both react to the same press. Instead components
 * register an *interceptor* here. They run newest-first, and the first one
 * to claim the press stops the chain — which is exactly the layering the
 * user sees on screen.
 */

/** Return `true` to claim the press and stop it propagating. */
type BackInterceptor = () => boolean;

const interceptors: BackInterceptor[] = [];

/**
 * Register an interceptor for as long as a layer is open. Returns the
 * unregister function, so it drops straight into a `useEffect` cleanup.
 */
export function registerBackInterceptor(fn: BackInterceptor): () => void {
  interceptors.push(fn);
  return () => {
    const at = interceptors.indexOf(fn);
    if (at !== -1) interceptors.splice(at, 1);
  };
}

let started = false;

/**
 * Wire the hardware back button. Does nothing on the web, where the
 * browser's own back button already does all of this.
 */
export async function startBackButtonHandling(): Promise<void> {
  if (!isNative() || started) return;
  started = true;

  await App.addListener('backButton', ({ canGoBack }) => {
    // Topmost layer first: a sheet closes before the page changes.
    for (let i = interceptors.length - 1; i >= 0; i -= 1) {
      if (interceptors[i]()) return;
    }

    if (canGoBack) {
      // Deliberately the browser history, not a router call: React Router's
      // history *is* the WebView history, so this keeps back behaving
      // identically on the phone and on the web, including the auth
      // redirects that use `replace`.
      window.history.back();
      return;
    }

    void App.exitApp();
  });
}
