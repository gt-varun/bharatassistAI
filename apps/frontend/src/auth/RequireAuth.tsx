import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * The application itself is behind the door. Everything a guest can see
 * lives on the landing page; the moment they ask for a real destination we
 * hand them to /login and remember where they were headed, so signing in
 * finishes the sentence they started rather than dropping them on the
 * dashboard.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const intended = `${location.pathname}${location.search}`;
    return <Navigate to="/login" state={{ from: intended }} replace />;
  }

  return <>{children}</>;
};
