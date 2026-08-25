import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { useOptionalAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui/use-toast';

export type SavedSchemeStatus = 'saved' | 'eligibility_checked' | 'application_in_progress' | 'applied';

export interface SavedSchemeItem {
  slug: string;
  status: SavedSchemeStatus;
  savedAt?: string | Date;
}

const KEY = 'bharatassist_saved_schemes';
const EVENT = 'bharatassist:saved-changed';

function read(): SavedSchemeItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => {
      if (typeof item === 'string') {
        return { slug: item, status: 'saved' as SavedSchemeStatus };
      }
      return {
        slug: item.slug || '',
        status: (item.status || 'saved') as SavedSchemeStatus,
        savedAt: item.savedAt
      };
    }).filter((item: SavedSchemeItem) => Boolean(item.slug));
  } catch {
    return [];
  }
}

/**
 * Saved schemes, by slug with status.
 *
 * For guests, uses localStorage. For authenticated users, uses the backend /api/saved.
 */
export function useSavedSchemes() {
  const auth = useOptionalAuth();
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Guest State
  const [localItems, setLocalItems] = useState<SavedSchemeItem[]>(read);

  useEffect(() => {
    if (isAuthenticated) return;
    const sync = () => setLocalItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [isAuthenticated]);

  const persistLocal = useCallback((next: SavedSchemeItem[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setLocalItems(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // Authenticated State
  const { data: serverData, isLoading } = useQuery<SavedSchemeItem[]>({
    queryKey: ['saved-schemes'],
    queryFn: async () => {
      const res = await apiClient.get('/saved');
      return (
        res.data?.data?.map((s: any) => ({
          slug: s.schemeId?.slug,
          status: s.status || 'saved',
          savedAt: s.savedAt
        })).filter((item: SavedSchemeItem) => Boolean(item.slug)) || []
      );
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000
  });

  const items: SavedSchemeItem[] = useMemo(
    () => (isAuthenticated ? (serverData ?? []) : localItems),
    [isAuthenticated, serverData, localItems]
  );
  const slugs: string[] = useMemo(() => items.map((i: SavedSchemeItem) => i.slug), [items]);
  const isInitializing = isAuthenticated && isLoading;

  const isSaved = useCallback(
    (slug: string) => items.some((item: SavedSchemeItem) => item.slug === slug),
    [items]
  );

  const getStatus = useCallback(
    (slug: string): SavedSchemeStatus => {
      const found = items.find((item: SavedSchemeItem) => item.slug === slug);
      return found?.status ?? 'saved';
    },
    [items]
  );

  const saveMutation = useMutation({
    mutationFn: async ({ slug, status }: { slug: string; status?: SavedSchemeStatus }) => {
      await apiClient.post('/saved', { slug, status: status ?? 'saved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-schemes'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('common.tryAgain')
      });
    }
  });

  const unsaveMutation = useMutation({
    mutationFn: async (slug: string) => {
      await apiClient.delete(`/saved/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-schemes'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('common.tryAgain')
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ slug, status }: { slug: string; status: SavedSchemeStatus }) => {
      await apiClient.patch(`/saved/${slug}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-schemes'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('common.tryAgain')
      });
    }
  });

  const toggle = useCallback(
    (slug: string) => {
      const currentlySaved = isSaved(slug);

      if (!isAuthenticated) {
        const next = currentlySaved
          ? localItems.filter((s) => s.slug !== slug)
          : [{ slug, status: 'saved' as SavedSchemeStatus, savedAt: new Date().toISOString() }, ...localItems];
        persistLocal(next);
        return !currentlySaved;
      }

      // Optimistic update
      queryClient.cancelQueries({ queryKey: ['saved-schemes'] });
      const previousData = queryClient.getQueryData<SavedSchemeItem[]>(['saved-schemes']);

      if (currentlySaved) {
        queryClient.setQueryData(['saved-schemes'], (old: SavedSchemeItem[] | undefined) =>
          old ? old.filter((s) => s.slug !== slug) : []
        );
        unsaveMutation.mutate(slug, {
          onError: () => {
            queryClient.setQueryData(['saved-schemes'], previousData);
          }
        });
      } else {
        queryClient.setQueryData(['saved-schemes'], (old: SavedSchemeItem[] | undefined) =>
          old ? [{ slug, status: 'saved' as SavedSchemeStatus, savedAt: new Date().toISOString() }, ...old] : [{ slug, status: 'saved' as SavedSchemeStatus, savedAt: new Date().toISOString() }]
        );
        saveMutation.mutate(
          { slug, status: 'saved' },
          {
            onError: () => {
              queryClient.setQueryData(['saved-schemes'], previousData);
            }
          }
        );
      }

      return !currentlySaved;
    },
    [isAuthenticated, isSaved, localItems, persistLocal, saveMutation, unsaveMutation, queryClient]
  );

  const updateStatus = useCallback(
    (slug: string, status: SavedSchemeStatus) => {
      if (!isAuthenticated) {
        const next = localItems.map((item) =>
          item.slug === slug ? { ...item, status } : item
        );
        persistLocal(next);
        return;
      }

      queryClient.cancelQueries({ queryKey: ['saved-schemes'] });
      const previousData = queryClient.getQueryData<SavedSchemeItem[]>(['saved-schemes']);

      queryClient.setQueryData(['saved-schemes'], (old: SavedSchemeItem[] | undefined) =>
        old ? old.map((item) => (item.slug === slug ? { ...item, status } : item)) : []
      );

      updateStatusMutation.mutate(
        { slug, status },
        {
          onError: () => {
            queryClient.setQueryData(['saved-schemes'], previousData);
          }
        }
      );
    },
    [isAuthenticated, localItems, persistLocal, updateStatusMutation, queryClient]
  );

  const clear = useCallback(() => {
    if (!isAuthenticated) {
      persistLocal([]);
    } else {
      if (serverData && serverData.length > 0) {
        const previousData = queryClient.getQueryData<SavedSchemeItem[]>(['saved-schemes']);
        queryClient.setQueryData(['saved-schemes'], []);
        Promise.all(serverData.map((item) => apiClient.delete(`/saved/${item.slug}`)))
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['saved-schemes'] });
          })
          .catch(() => {
            toast({
              variant: 'destructive',
              title: t('common.error'),
              description: t('common.tryAgain')
            });
            queryClient.setQueryData(['saved-schemes'], previousData);
          });
      }
    }
  }, [isAuthenticated, persistLocal, serverData, queryClient, toast, t]);

  return { slugs, items, isSaved, getStatus, updateStatus, toggle, clear, isInitializing };
}
