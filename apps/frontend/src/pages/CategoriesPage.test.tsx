import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CategoriesPage } from './CategoriesPage';
import { AuthProvider } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import '../i18n/config';

describe('CategoriesPage Component Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderWithProviders = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/categories']}>
            <CategoriesPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  const mockCategories = {
    segments: { student: 10, farmer: 8, women: 12, senior_citizen: 5 },
    benefitTypes: { cash: 6, subsidy: 14, loan: 4 },
    levels: { central: 12, state: 20 },
    states: { Karnataka: 12, Maharashtra: 8 }
  };

  it('renders category sections for segments, benefit types, and government levels', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { success: true, data: mockCategories }
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/10 schemes/i)).toBeDefined();
      expect(screen.getByText(/8 schemes/i)).toBeDefined();
    });

    // Segment names
    expect(screen.getByText('Students')).toBeDefined();
    expect(screen.getByText('Farmers')).toBeDefined();
    expect(screen.getByText('Women')).toBeDefined();

    // Central & State cards
    expect(screen.getAllByText('12 schemes').length).toBe(2);
    expect(screen.getByText('20 schemes')).toBeDefined();

    // State tag
    expect(screen.getByText('Karnataka')).toBeDefined();
    expect(screen.getByText('Maharashtra')).toBeDefined();
  });
});
