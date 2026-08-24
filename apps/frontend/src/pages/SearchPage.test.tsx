import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SearchPage } from './SearchPage';
import { AuthProvider } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import '../i18n/config';

describe('SearchPage Component Tests', () => {
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

  const renderWithProviders = (initialEntries = ['/search']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <SearchPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  const mockSearchResults = {
    schemes: [
      {
        _id: '665f1a2b3c4d5e6f7a8b9001',
        name: 'Karnataka Vidyasiri Scholarship',
        slug: 'karnataka-vidyasiri-scholarship',
        department: 'Department of Collegiate Education',
        level: 'state',
        state: 'Karnataka',
        shortDescription: 'Scholarship for Karnataka students',
        benefitType: 'subsidy',
        benefitSummary: 'Tuition reimbursement',
        status: 'open',
        lastVerifiedAt: '2026-08-01T00:00:00.000Z'
      },
      {
        _id: '665f1a2b3c4d5e6f7a8b9002',
        name: 'PM-KISAN Samman Nidhi',
        slug: 'pm-kisan-samman-nidhi',
        department: 'Ministry of Agriculture',
        level: 'central',
        state: null,
        shortDescription: 'Income support for farmers',
        benefitType: 'cash',
        benefitSummary: '₹6,000 per year',
        status: 'open',
        lastVerifiedAt: '2026-08-01T00:00:00.000Z'
      }
    ],
    pagination: { total: 2, page: 1, limit: 10, totalPages: 1 }
  };

  it('renders search bar and displays search results from API', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { success: true, data: mockSearchResults.schemes, pagination: mockSearchResults.pagination }
    });

    renderWithProviders(['/search?q=student']);

    await waitFor(() => {
      expect(screen.getByText('Karnataka Vidyasiri Scholarship')).toBeDefined();
      expect(screen.getByText('PM-KISAN Samman Nidhi')).toBeDefined();
    });

    expect(screen.getByLabelText(/Search schemes/i)).toBeDefined();
  });

  it('handles empty search results state gracefully', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { success: true, data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } }
    });

    renderWithProviders(['/search?q=unknownquery']);

    await waitFor(() => {
      expect(screen.getByText(/No scheme matched that/i)).toBeDefined();
    });
  });

  it('filters results when search query input changes', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { success: true, data: mockSearchResults.schemes, pagination: mockSearchResults.pagination }
    });

    renderWithProviders();

    const input = screen.getByLabelText(/Search schemes/i);
    fireEvent.change(input, { target: { value: 'farmer' } });

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalled();
    });
  });
});
