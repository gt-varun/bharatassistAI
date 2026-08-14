import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCitizenProfile } from '../hooks/useCitizenProfile';
import { wasOnboardingSkipped } from './useOnboarding';

/**
 * Sends a citizen who has not told us anything about themselves to the
 * questions, once.
 *
 * It sits between `RequireAuth` and the application shell, so it only ever
 * considers someone who is already signed in, and it deliberately does not
 * wrap `/welcome` itself — a gate that guarded its own destination would
 * redirect for ever.
 *
 * Two things keep it from becoming a trap. It redirects only once the
 * profile query has actually resolved, so a slow connection shows the app
 * rather than a blank screen; and "fill this in later" is remembered on the
 * device, after which the dashboard's own prompt is the way back in.
 *
 * Where the citizen was headed travels along in `state.from`, so a deep
 * link into a scheme survives both the sign-in redirect and this one.
 */
export const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { data: profile, isLoading, isFetched } = useCitizenProfile();

  const needsOnboarding = isFetched && !isLoading && profile === null && !wasOnboardingSkipped();

  if (needsOnboarding) {
    return (
      <Navigate
        to="/welcome"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
};
