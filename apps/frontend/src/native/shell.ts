import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isAndroid, isNative } from './platform';
import { startBackButtonHandling } from './backButton';

const PAPER = '#F4F5F3';

/**
 * Everything the native shell needs on boot, in one call from main.tsx.
 *
 * Each step is individually guarded: a plugin that is unavailable on a
 * particular OS version must not take the rest of the startup down with
 * it. The app is perfectly usable with the wrong status-bar tint; it is
 * not usable if the splash screen never lifts.
 */
export async function initNativeShell(): Promise<void> {
  if (!isNative()) return;

  // --- Status bar -------------------------------------------------------
  // Dark glyphs, because the register's ground is light paper.
  try {
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    /* Not fatal — the OS default stays. */
  }

  if (isAndroid()) {
    try {
      // Android 15 forces edge-to-edge and removed this API; the CSS
      // safe-area padding is what handles that case, so a rejection here
      // is expected rather than exceptional.
      await StatusBar.setBackgroundColor({ color: PAPER });
    } catch {
      /* Android 15+: handled by env(safe-area-inset-top) in index.css. */
    }
  }

  // --- Keyboard ---------------------------------------------------------
  // `resize: 'native'` (capacitor.config.ts) already shrinks the WebView so
  // fixed footers ride above the keyboard. What CSS cannot know is *that*
  // the keyboard is open, and with it up the bottom tab bar is both
  // useless and occupying scarce space — so mark the document and let
  // `.hide-on-keyboard` deal with it.
  const setKeyboardOpen = (open: boolean, height = 0) => {
    document.documentElement.classList.toggle('keyboard-open', open);
    document.documentElement.style.setProperty('--keyboard-h', `${open ? height : 0}px`);
  };

  try {
    await Keyboard.addListener('keyboardWillShow', (info) =>
      setKeyboardOpen(true, info.keyboardHeight)
    );
    // Android reports only the "did" events.
    await Keyboard.addListener('keyboardDidShow', (info) =>
      setKeyboardOpen(true, info.keyboardHeight)
    );
    await Keyboard.addListener('keyboardWillHide', () => setKeyboardOpen(false));
    await Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
  } catch {
    /* Without the listeners the tab bar simply stays put. */
  }

  // --- Hardware back ----------------------------------------------------
  try {
    await startBackButtonHandling();
  } catch {
    /* Falls back to the OS default (leaving the app). */
  }

  // --- Splash -----------------------------------------------------------
  // Called once React has actually painted, so the citizen never sees the
  // blank frame between the splash lifting and the first render.
  try {
    await SplashScreen.hide();
  } catch {
    /* `launchAutoHide` in capacitor.config.ts is the backstop. */
  }
}
