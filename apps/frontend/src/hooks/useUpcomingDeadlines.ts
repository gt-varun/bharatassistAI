import { useQuery } from '@tanstack/react-query';
import type { User } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { useOptionalAuth } from '../auth/AuthContext';
import { daysUntil } from '../lib/format';
import { useSavedSchemes } from './useSavedSchemes';
import { useSchemeRecords } from './useSchemeRecords';

/** Same window `SavedSchemesPage` uses for its own "closing soon" banner. */
const CLOSING_SOON_WINDOW_DAYS = 30;

/**
 * Count of saved schemes whose deadline falls within the next 30 days —
 * the in-app stand-in for PRD §11.9's "reminders for approaching
 * deadlines" (no email/push channel exists, so this surfaces as a nav
 * badge instead, reusing the same threshold `SavedSchemesPage` already
 * renders inline).
 *
 * Respects the citizen's notification preference: signed-in and opted out
 * of `notificationsEnabled` means the count stays at zero rather than
 * nagging through a channel they turned off. Guests have no such setting
 * to respect, so their local saves always count.
 */
export function useUpcomingDeadlines() {
  const auth = useOptionalAuth();
  const isAuthenticated = Boolean(auth?.isAuthenticated);

  const { data: account } = useQuery<User | null>({
    queryKey: ['account'],
    queryFn: async () => (await apiClient.get('/profile/settings')).data?.data ?? null,
    enabled: isAuthenticated,
    staleTime: 60 * 1000
  });

  const { slugs } = useSavedSchemes();
  const { schemes } = useSchemeRecords(slugs);

  const notificationsOff = isAuthenticated && account?.notificationsEnabled === false;

  const count = notificationsOff
    ? 0
    : schemes.filter((scheme) => {
        const daysLeft = daysUntil(scheme.deadline);
        return daysLeft !== null && daysLeft >= 0 && daysLeft <= CLOSING_SOON_WINDOW_DAYS;
      }).length;

  return { count };
}
