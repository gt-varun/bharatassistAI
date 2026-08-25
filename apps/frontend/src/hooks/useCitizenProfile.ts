import { useQuery } from '@tanstack/react-query';
import type { CitizenProfile } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { useOptionalAuth } from '../auth/AuthContext';

/** The one cache key for the signed-in citizen's profile. */
export const PROFILE_QUERY_KEY = ['profile'] as const;

/**
 * The citizen's profile, or `null` when they have not made one yet.
 *
 * A missing profile is the normal first state, not an error: `GET /profile`
 * answers 404 until something has been saved, and that 404 is what the
 * onboarding gate reads to decide whether to ask. Both the gate and the
 * profile screen go through here so there is one query — two `useQuery`
 * calls sharing a key but disagreeing about how to treat a 404 would give
 * whichever mounted first the final say.
 */
export function useCitizenProfile() {
  const auth = useOptionalAuth();
  const isAuthenticated = Boolean(auth?.isAuthenticated);

  return useQuery<CitizenProfile | null>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await apiClient.get('/profile');
        return (res.data?.data ?? null) as CitizenProfile | null;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000
  });
}
