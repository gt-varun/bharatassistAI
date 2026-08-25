import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import { AuthProvider } from '../auth/AuthContext';
import { apiClient, setAuthTokens, clearAuthTokens } from '../api/client';
import '../i18n/config';

describe('ProfilePage Component Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderAsGuest = () => {
    clearAuthTokens();
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <ProfilePage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  const renderAuthenticated = () => {
    const user = { _id: 'user-1', phone: '9876543210', preferredLanguage: 'en', refreshTokenVersion: 0 };
    localStorage.setItem('bharatassist_user', JSON.stringify(user));
    setAuthTokens('mock_access_token', 'mock_refresh_token');

    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/profile') {
        return {
          data: {
            data: {
              userId: 'user-1',
              fullName: 'Aarav Sharma',
              currentState: 'Karnataka',
              district: 'Bengaluru Urban',
              occupationCategory: 'student',
              incomeBand: 'below_1l'
            }
          }
        } as any;
      }
      return { data: { data: null } } as any;
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <ProfilePage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('renders sign-in prompt for guest user', async () => {
    renderAsGuest();
    expect(screen.getByText(/Your state, age and income decide which schemes you qualify for/i)).toBeDefined();
    expect(screen.getByRole('link', { name: /Sign in/i })).toBeDefined();
  });

  it('renders profile form and completeness indicator for authenticated user', async () => {
    renderAuthenticated();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Aarav Sharma')).toBeDefined();
    });

    // Check completeness indicator is visible
    expect(screen.getByText(/filled/i)).toBeDefined();
    expect(screen.getByText(/Save details/i)).toBeDefined();
  });
});
