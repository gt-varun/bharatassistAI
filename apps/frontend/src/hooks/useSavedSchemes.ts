import { useCallback, useEffect, useState } from 'react';

const KEY = 'bharatassist_saved_schemes';
const EVENT = 'bharatassist:saved-changed';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Saved schemes, by slug.
 *
 * Person 4 owns the saved-schemes API; the backend currently exposes only
 * `GET /api/saved`, so this keeps the list on the device and stays usable for
 * guests. Swap the two mutators for the API calls once `POST`/`DELETE
 * /api/saved` land — the component contract does not change.
 */
export function useSavedSchemes() {
  const [slugs, setSlugs] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setSlugs(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setSlugs(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const isSaved = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback(
    (slug: string) => {
      const next = slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [slug, ...slugs];
      persist(next);
      return next.includes(slug);
    },
    [slugs, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { slugs, isSaved, toggle, clear };
}
