import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import { AuthProvider } from '../auth/AuthContext';
import { apiClient, setAuthTokens } from '../api/client';
import '../i18n/config';

describe('SettingsPage Component Tests', () => {
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

  const renderComponent = () => {
    const user = { _id: 'user-1', email: 'citizen@example.com', preferredLanguage: 'en', notificationsEnabled: true };
    localStorage.setItem('bharatassist_user', JSON.stringify(user));
    setAuthTokens('mock_access_token', 'mock_refresh_token');

    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/profile/settings') {
        return { data: { data: user } } as any;
      }
      return { data: { data: null } } as any;
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('renders settings controls for language, notifications, export and delete', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Language/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Download my data/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Delete my account/i })).toBeDefined();
    });
  });
});
