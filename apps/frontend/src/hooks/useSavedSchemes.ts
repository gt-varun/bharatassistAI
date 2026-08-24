import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui/use-toast';

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
 * For guests, uses localStorage. For authenticated users, uses the backend /api/saved.
 */
export function useSavedSchemes() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Guest State
  const [localSlugs, setLocalSlugs] = useState<string[]>(read);

  useEffect(() => {
    if (isAuthenticated) return;
    const sync = () => setLocalSlugs(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [isAuthenticated]);

  const persistLocal = useCallback((next: string[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setLocalSlugs(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // Authenticated State
  const { data: serverSlugs, isLoading } = useQuery<string[]>({
    queryKey: ['saved-schemes'],
    queryFn: async () => {
      const res = await apiClient.get('/saved');
      return res.data?.data?.map((s: any) => s.schemeId?.slug).filter(Boolean) || [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000
  });

  const slugs = isAuthenticated ? (serverSlugs ?? []) : localSlugs;
  const isInitializing = isAuthenticated && isLoading;

  const isSaved = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const saveMutation = useMutation({
    mutationFn: async (slug: string) => {
      await apiClient.post('/saved', { slug });
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

  const toggle = useCallback(
    (slug: string) => {
      const currentlySaved = isSaved(slug);
      
      if (!isAuthenticated) {
        const next = currentlySaved ? localSlugs.filter((s) => s !== slug) : [slug, ...localSlugs];
        persistLocal(next);
        return !currentlySaved;
      }

      // Optimistic update
      queryClient.cancelQueries({ queryKey: ['saved-schemes'] });
      const previousSlugs = queryClient.getQueryData<string[]>(['saved-schemes']);
      
      if (currentlySaved) {
        queryClient.setQueryData(['saved-schemes'], (old: string[] | undefined) => 
          old ? old.filter(s => s !== slug) : []
        );
        unsaveMutation.mutate(slug, {
          onError: () => {
            queryClient.setQueryData(['saved-schemes'], previousSlugs);
          }
        });
      } else {
        queryClient.setQueryData(['saved-schemes'], (old: string[] | undefined) => 
          old ? [slug, ...old] : [slug]
        );
        saveMutation.mutate(slug, {
          onError: () => {
            queryClient.setQueryData(['saved-schemes'], previousSlugs);
          }
        });
      }
      
      return !currentlySaved;
    },
    [isAuthenticated, isSaved, localSlugs, persistLocal, saveMutation, unsaveMutation, queryClient]
  );

  const clear = useCallback(() => {
    if (!isAuthenticated) {
      persistLocal([]);
    } else {
      if (serverSlugs) {
        const previousSlugs = queryClient.getQueryData<string[]>(['saved-schemes']);
        queryClient.setQueryData(['saved-schemes'], []);
        Promise.all(serverSlugs.map(slug => apiClient.delete(`/saved/${slug}`))).then(() => {
          queryClient.invalidateQueries({ queryKey: ['saved-schemes'] });
        }).catch(() => {
          toast({
            variant: 'destructive',
            title: t('common.error'),
            description: t('common.tryAgain')
          });
          queryClient.setQueryData(['saved-schemes'], previousSlugs);
        });
      }
    }
  }, [isAuthenticated, persistLocal, serverSlugs, queryClient, toast, t]);

  return { slugs, isSaved, toggle, clear, isInitializing };
}
