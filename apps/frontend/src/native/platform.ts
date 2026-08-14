import { Capacitor } from '@capacitor/core';

/**
 * Where this copy of the app is running.
 *
 * Every native capability in `src/native/` is gated on these, so the web
 * build behaves exactly as it did before Capacitor existed: the plugin
 * imports resolve to Capacitor's web shims, the guards return false, and
 * nothing native is ever reached. This is the single place that decides.
 */

/** True only inside a packaged Android/iOS app — false in every browser. */
export const isNative = (): boolean => Capacitor.isNativePlatform();

export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';

export const isIOS = (): boolean => Capacitor.getPlatform() === 'ios';

/** `'web' | 'android' | 'ios'` — useful for logging and conditional copy. */
export const platform = (): string => Capacitor.getPlatform();
