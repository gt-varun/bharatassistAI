import type { CapacitorConfig } from '@capacitor/cli';

/**
 * BharatAssist AI — native shell configuration.
 *
 * The web app is the product; this file only describes how it is hosted
 * inside a WebView. Two rules govern everything here:
 *
 *  1. Nothing environment-specific is baked in. There is deliberately no
 *     `server.url`: a packaged build must load the assets bundled with it,
 *     never a developer's laptop. The API it talks to comes from
 *     `VITE_API_URL` at build time (see .env.example), so the same source
 *     produces a staging app and a production app without edits here.
 *
 *  2. Nothing is loosened for convenience. Cleartext stays off, mixed
 *     content stays off, and the scheme stays `https` — which also keeps the
 *     WebView a secure context, so `crypto.randomUUID()` (used by the
 *     assistant) and the Web Crypto API keep working exactly as on the web.
 */
const config: CapacitorConfig = {
  appId: 'in.bharatassist.app',
  appName: 'BharatAssist AI',
  webDir: 'dist',

  server: {
    // A secure origin (https://localhost) rather than the legacy
    // http://localhost scheme. Required for secure-context web APIs.
    androidScheme: 'https'
  },

  android: {
    // The register only ever talks to HTTPS APIs; a WebView that silently
    // upgrades to mixed content would hide a misconfigured deployment.
    allowMixedContent: false
  },

  plugins: {
    SplashScreen: {
      // Auto-hide is a dead-man's switch: the app calls hide() itself as
      // soon as React has painted, but if the bundle ever fails to boot the
      // splash must not become a permanent blank screen.
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#F4F5F3', // paper
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: false,
      splashImmersive: false
    },

    StatusBar: {
      // The WebView sits *below* the status bar rather than under it, so a
      // record heading can never collide with the clock or the Dynamic
      // Island. Bottom/side insets are still handled in CSS via env(),
      // which is what Android 15's forced edge-to-edge needs.
      overlaysWebView: false,
      style: 'LIGHT', // dark glyphs, for our light paper ground
      backgroundColor: '#F4F5F3'
    },

    Keyboard: {
      // Resizing the native WebView keeps `100dvh`, sticky footers and the
      // assistant composer above the keyboard without any JS layout maths.
      resize: 'native',
      resizeOnFullScreen: true
    }
  }
};

export default config;
