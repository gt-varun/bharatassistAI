import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedScheme, Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const KEY = 'bharatassist_saved_schemes';
const STATUS_KEY = 'bharatassist_saved_status';
const EVENT = 'bharatassist:saved-changed';

export type SavedStatus =
  | 'saved'
  | 'eligibility_checked'
  | 'application_in_progress'
  | 'applied';

/** Keys rather than labels: the stage names are read by the citizen. */
export const SAVED_STATUSES: { id: SavedStatus; labelKey: string }[] = [
  { id: 'saved', labelKey: 'savedPage.statusSaved' },
  { id: 'eligibility_checked', labelKey: 'savedPage.statusChecked' },
  { id: 'application_in_progress', labelKey: 'savedPage.statusInProgress' },
  { id: 'applied', labelKey: 'savedPage.statusApplied' }
];

/** A saved entry as the server returns it, with the scheme record populated. */
type SavedEntry = Omit<SavedScheme, 'schemeId'> & { schemeId: Scheme | string | null };

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const readSlugs = () => readLocal<string[]>(KEY, []);
const readStatuses = () => readLocal<Record<string, SavedStatus>>(STATUS_KEY, {});

/**
 * Saved schemes, keyed by slug.
 *
 * Signed in, the list lives on the server so it follows the citizen between
 * devices; as a guest it lives in localStorage so bookmarking still works
 * without an account (§2.3, and the guest mode of §2.1). Whatever a guest
 * saved before signing in is pushed up on their first authenticated render,
 * so nothing is lost at the door.
 */
export function useSavedSchemes() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [localSlugs, setLocalSlugs] = useState<string[]>(readSlugs);
  const [localStatuses, setLocalStatuses] = useState<Record<string, SavedStatus>>(readStatuses);

  useEffect(() => {
    const sync = () => {
      setLocalSlugs(readSlugs());
      setLocalStatuses(readStatuses());
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const { data: remote, isLoading } = useQuery<SavedEntry[]>({
    queryKey: ['saved'],
    queryFn: async () => {
      const res = await apiClient.get('/saved');
      return (res.data?.data ?? []) as SavedEntry[];
    },
    enabled: isAuthenticated
  });

  const slugOf = (entry: SavedEntry): string | null =>
    typeof entry.schemeId === 'object' && entry.schemeId ? entry.schemeId.slug : null;

  const remoteSlugs = useMemo(
    () => (remote ?? []).map(slugOf).filter((s): s is string => Boolean(s)),
    [remote]
  );

  const remoteStatuses = useMemo(() => {
    const map: Record<string, SavedStatus> = {};
    for (const entry of remote ?? []) {
      const slug = slugOf(entry);
      if (slug) map[slug] = entry.status as SavedStatus;
    }
    return map;
  }, [remote]);

  const persistLocal = useCallback((slugs: string[], statuses: Record<string, SavedStatus>) => {
    localStorage.setItem(KEY, JSON.stringify(slugs));
    localStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
    setLocalSlugs(slugs);
    setLocalStatuses(statuses);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // Carry a guest's bookmarks up to their new account, once.
  useEffect(() => {
    if (!isAuthenticated || remote === undefined || localSlugs.length === 0) return;
    const pending = localSlugs;
    void (async () => {
      await Promise.allSettled(
        pending.map((slug) =>
          apiClient.post('/saved', { slug, status: readStatuses()[slug] ?? 'saved' })
        )
      );
      persistLocal([], {});
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    })();
  }, [isAuthenticated, remote, localSlugs, persistLocal, queryClient]);

  const save = useMutation({
    mutationFn: (slug: string) => apiClient.post('/saved', { slug }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved'] })
  });

  const remove = useMutation({
    mutationFn: (slug: string) => apiClient.delete(`/saved/${slug}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved'] })
  });

  const patchStatus = useMutation({
    mutationFn: ({ slug, status }: { slug: string; status: SavedStatus }) =>
      apiClient.patch(`/saved/${slug}`, { status }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved'] })
  });

  const slugs = isAuthenticated ? remoteSlugs : localSlugs;
  const statuses = isAuthenticated ? remoteStatuses : localStatuses;

  const isSaved = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const statusOf = useCallback(
    (slug: string): SavedStatus => statuses[slug] ?? 'saved',
    [statuses]
  );

  const toggle = useCallback(
    (slug: string) => {
      const wasSaved = slugs.includes(slug);

      if (isAuthenticated) {
        // Answer the click straight away; the refetch confirms it.
        queryClient.setQueryData<SavedEntry[]>(['saved'], (current) => {
          const list = current ?? [];
          if (wasSaved) return list.filter((e) => slugOf(e) !== slug);
          // A stand-in entry until the refetch brings the real record: only
          // the slug and status are read before then.
          return [
            {
              userId: '',
              schemeId: { slug } as Scheme,
              status: 'saved',
              savedAt: new Date().toISOString()
            } as SavedEntry,
            ...list
          ];
        });
        if (wasSaved) remove.mutate(slug);
        else save.mutate(slug);
        return !wasSaved;
      }

      const nextSlugs = wasSaved ? localSlugs.filter((s) => s !== slug) : [slug, ...localSlugs];
      const nextStatuses = { ...localStatuses };
      if (wasSaved) delete nextStatuses[slug];
      else nextStatuses[slug] = 'saved';
      persistLocal(nextSlugs, nextStatuses);
      return !wasSaved;
    },
    [slugs, isAuthenticated, queryClient, remove, save, localSlugs, localStatuses, persistLocal]
  );

  const setStatus = useCallback(
    (slug: string, status: SavedStatus) => {
      if (isAuthenticated) {
        patchStatus.mutate({ slug, status });
        return;
      }
      persistLocal(localSlugs, { ...localStatuses, [slug]: status });
    },
    [isAuthenticated, patchStatus, localSlugs, localStatuses, persistLocal]
  );

  const clear = useCallback(() => {
    if (isAuthenticated) {
      void Promise.allSettled(slugs.map((slug) => apiClient.delete(`/saved/${slug}`))).then(() =>
        queryClient.invalidateQueries({ queryKey: ['saved'] })
      );
      return;
    }
    persistLocal([], {});
  }, [isAuthenticated, slugs, queryClient, persistLocal]);

  return {
    slugs,
    statuses,
    isSaved,
    statusOf,
    toggle,
    setStatus,
    clear,
    isLoading: isAuthenticated && isLoading
  };
}
