import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { AuthProvider } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import '../i18n/config';

describe('LandingPage Component Tests', () => {
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
          <MemoryRouter initialEntries={['/']}>
            <LandingPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  const mockCategoriesData = {
    segments: { student: 12, farmer: 8, women: 15 },
    levels: { central: 10, state: 25 },
    states: { Karnataka: 15, Maharashtra: 10 }
  };

  const mockRecentSchemes = [
    {
      _id: '665f1a2b3c4d5e6f7a8b9001',
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
  ];

  it('renders hero title, search bar, and primary call-to-actions', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/schemes/categories')) {
        return { data: { success: true, data: mockCategoriesData } };
      }
      if (url.includes('/schemes')) {
        return { data: { success: true, data: mockRecentSchemes } };
      }
      return { data: { success: true, data: [] } };
    });

    renderWithProviders();

    // Value proposition hero title
    expect(screen.getByText(/Tell us your situation/i)).toBeDefined();
    expect(screen.getByText(/We'll find the schemes you can claim/i)).toBeDefined();

    // Primary search action
    expect(screen.getByRole('button', { name: /Find schemes/i })).toBeDefined();

    // Segment shortcuts and 3-question quick match CTA
    expect(screen.getAllByText(/Answer 3 questions/i).length).toBeGreaterThan(0);
  });

  it('renders live index metrics and target segment shortcut tiles', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/schemes/categories')) {
        return { data: { success: true, data: mockCategoriesData } };
      }
      if (url.includes('/schemes')) {
        return { data: { success: true, data: mockRecentSchemes } };
      }
      return { data: { success: true, data: [] } };
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('PM-KISAN Samman Nidhi')).toBeDefined();
    });

    // Central & state scheme counts
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('25')).toBeDefined();
  });

  it('opens quick match dialog when 3 questions button is clicked', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async () => ({
      data: { success: true, data: [] }
    }));

    renderWithProviders();

    const quickMatchBtns = screen.getAllByRole('button', { name: /Answer 3 questions/i });
    fireEvent.click(quickMatchBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Where do you live\?/i)).toBeDefined();
    });
  });
});
