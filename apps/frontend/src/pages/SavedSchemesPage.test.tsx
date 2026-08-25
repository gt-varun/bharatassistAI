import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SavedSchemesPage } from './SavedSchemesPage';
import { apiClient } from '../api/client';
import '../i18n/config';

describe('SavedSchemesPage Component Tests', () => {
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
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SavedSchemesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders empty state when no schemes are saved', async () => {
    renderComponent();
    expect(screen.getByText(/Nothing saved yet/i)).toBeDefined();
    expect(screen.getByText(/Find schemes/i)).toBeDefined();
  });

  it('renders saved schemes list and status filter tabs', async () => {
    const mockSaved = [
      {
        slug: 'karnataka-vidyasiri-scholarship',
        status: 'saved',
        savedAt: new Date().toISOString()
      },
      {
        slug: 'pm-kisan-samman-nidhi',
        status: 'applied',
        savedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('bharatassist_saved_schemes', JSON.stringify(mockSaved));

    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/schemes/karnataka-vidyasiri-scholarship') {
        return {
          data: {
            data: {
              _id: '665f1a2b3c4d5e6f7a8b9001',
              name: 'Karnataka Vidyasiri Scholarship',
              slug: 'karnataka-vidyasiri-scholarship',
              department: 'Department of Collegiate Education',
              level: 'state',
              state: 'Karnataka',
              shortDescription: 'Scholarship for students in Karnataka',
              targetSegments: ['student'],
              benefitType: 'subsidy',
              benefitSummary: 'Full tuition reimbursement',
              status: 'open',
              deadline: null
            }
          }
        } as any;
      }
      if (url === '/schemes/pm-kisan-samman-nidhi') {
        return {
          data: {
            data: {
              _id: '665f1a2b3c4d5e6f7a8b9002',
              name: 'PM Kisan Samman Nidhi',
              slug: 'pm-kisan-samman-nidhi',
              department: 'Ministry of Agriculture',
              level: 'central',
              state: null,
              shortDescription: 'Financial benefit for landholder farmers',
              targetSegments: ['farmer'],
              benefitType: 'cash',
              benefitSummary: '₹6,000 / year in three installments',
              status: 'open',
              deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days left
            }
          }
        } as any;
      }
      return { data: { data: null } } as any;
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Karnataka Vidyasiri Scholarship')).toBeDefined();
      expect(screen.getByText('PM Kisan Samman Nidhi')).toBeDefined();
    });

    // Check status tabs
    expect(screen.getByRole('button', { name: /^All/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Applied/i })).toBeDefined();

    // Check deadline warning
    expect(screen.getByText(/Deadline approaching/i)).toBeDefined();
  });
});
