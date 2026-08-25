import { lazy } from 'react';

/**
 * Wraps `React.lazy` so a stale chunk reference doesn't dead-end on the
 * router's default error screen.
 *
 * A lazy import's URL is content-hashed, so the browser's copy of the
 * module graph goes stale the moment a new build (or, in dev, a server
 * restart) ships different hashes — the next navigation to an
 * as-yet-unfetched chunk 404s with "Failed to fetch dynamically imported
 * module" and nothing recovers on its own. The fix everyone converges on:
 * treat that specific failure as "this tab is running stale code," and
 * reload once to pick up the current build. A sessionStorage flag stops a
 * second reload if the module is genuinely broken rather than stale, so a
 * real error still surfaces instead of reload-looping.
 */
export function lazyWithRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) {
  return lazy(async () => {
    const key = `bharatassist_chunk_retry:${factory.toString()}`;
    try {
      const module = await factory();
      sessionStorage.removeItem(key);
      return module;
    } catch (error) {
      const alreadyRetried = sessionStorage.getItem(key) === '1';
      if (!alreadyRetried) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        // The reload takes over before this promise would otherwise
        // reject into the route's error boundary.
        return new Promise<T>(() => {});
      }
      throw error;
    }
  });
}
