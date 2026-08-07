import { useQueries } from '@tanstack/react-query';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';

/**
 * Resolves a list of scheme slugs into full records. Used by the saved list
 * and the dashboard, which both hold slugs rather than records.
 */
export function useSchemeRecords(slugs: string[]) {
  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ['scheme', slug],
      queryFn: async (): Promise<Scheme> => {
        const res = await apiClient.get(`/schemes/${slug}`);
        return res.data?.data;
      },
      staleTime: 5 * 60 * 1000
    }))
  });

  return {
    schemes: results.map((r) => r.data).filter((s): s is Scheme => Boolean(s)),
    isLoading: results.some((r) => r.isLoading),
    // A slug that no longer resolves means the record left the register.
    missing: slugs.filter((_, i) => results[i]?.isError)
  };
}
