import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@bharatassist/shared-types';
import { apiClient, setAuthTokens, clearAuthTokens, hasAccessToken } from '../api/client';

const USER_KEY = 'bharatassist_user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** Signs in with mobile + OTP. Returns nothing; throws on failure. */
  signInWithOtp: (phone: string, otp: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => (hasAccessToken() ? readStoredUser() : null));

  // A token cleared by the refresh interceptor (in another tab, or after a
  // failed refresh) must not leave a stale user card in the sidebar.
  useEffect(() => {
    const sync = () => {
      setUser(hasAccessToken() ? readStoredUser() : null);
    };
    window.addEventListener('storage', sync);
    window.addEventListener('bharatassist:signed-out', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('bharatassist:signed-out', sync);
    };
  }, []);

  const persist = useCallback((nextUser: User, accessToken: string, refreshToken: string) => {
    setAuthTokens(accessToken, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    await apiClient.post('/auth/send-otp', { phone });
  }, []);

  const signInWithOtp = useCallback(
    async (phone: string, otp: string) => {
      const res = await apiClient.post('/auth/verify-otp', { phone, otp });
      const payload = res.data?.data;
      if (!payload?.accessToken) throw new Error('Sign-in did not return a session.');
      persist(payload.user, payload.accessToken, payload.refreshToken);
    },
    [persist]
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const res = await apiClient.post('/auth/login', { email, password });
      const payload = res.data?.data;
      if (!payload?.accessToken) throw new Error('Sign-in did not return a session.');
      persist(payload.user, payload.accessToken, payload.refreshToken);
    },
    [persist]
  );

  const signOut = useCallback(() => {
    apiClient.post('/auth/logout').catch(() => {
      /* The local session is cleared either way. */
    });
    clearAuthTokens();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      requestOtp,
      signInWithOtp,
      signInWithPassword,
      signOut
    }),
    [user, requestOtp, signInWithOtp, signInWithPassword, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
