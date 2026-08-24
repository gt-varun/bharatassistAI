import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ChecklistPage } from './ChecklistPage';
import { apiClient } from '../api/client';
import '../i18n/config';

describe('ChecklistPage Component Tests', () => {
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

  const renderWithProviders = (initialEntries = ['/checklist?scheme=karnataka-vidyasiri-scholarship']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <ChecklistPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  const mockChecklistData = {
    schemeId: 'karnataka-vidyasiri-scholarship',
    schemeName: 'Karnataka Vidyasiri Scholarship',
    items: [
      {
        label: 'Aadhaar Card',
        status: 'have',
        howToObtain: 'Download from UIDAI portal',
        mandatory: true
      },
      {
        label: 'Income Certificate',
        status: 'required',
        howToObtain: 'Apply at Taluk office or Nadakacheri',
        mandatory: true
      },
      {
        label: 'Ration Card',
        status: 'pending',
        howToObtain: 'Food and Civil Supplies department',
        mandatory: false
      },
      {
        label: 'Disability Certificate',
        status: 'not_applicable',
        howToObtain: 'UDID Portal',
        mandatory: true
      }
    ]
  };

  describe('Initial rendering and state views', () => {
    it('renders empty picker state when no scheme query parameter is provided', () => {
      renderWithProviders(['/checklist']);
      expect(screen.getByText(/Choose a scheme first/i)).toBeDefined();
    });

    it('shows loading state while fetching checklist data', () => {
      vi.spyOn(apiClient, 'get').mockReturnValue(new Promise(() => {}));
      renderWithProviders();
      expect(screen.getByText(/Loading document checklist from server/i)).toBeDefined();
    });

    it('renders checklist items with status, instructions, and progress counter', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockChecklistData }
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Karnataka Vidyasiri Scholarship')).toBeDefined();
      });

      // Progress text (1 have out of 4)
      expect(screen.getByText(/1\/4 Ready/i)).toBeDefined();

      // Document labels and instructions
      expect(screen.getByText('Aadhaar Card')).toBeDefined();
      expect(screen.getByText('Income Certificate')).toBeDefined();
      expect(screen.getByText(/Apply at Taluk office or Nadakacheri/i)).toBeDefined();

      // Badges
      expect(screen.getAllByText('Required')).toHaveLength(2);
      expect(screen.getByText('Optional')).toBeDefined();
      expect(screen.getByText('Not Applicable')).toBeDefined();
    });
  });

  describe('User interactions and status mutations', () => {
    it('toggles document completion status via checkbox and triggers PATCH mutation', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockChecklistData }
      });

      const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            ...mockChecklistData,
            items: mockChecklistData.items.map((item) =>
              item.label === 'Income Certificate' ? { ...item, status: 'have' } : item
            )
          }
        }
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Income Certificate')).toBeDefined();
      });

      // Toggle Income Certificate checkbox
      const incomeCheckbox = document.getElementById('doc-Income Certificate');
      expect(incomeCheckbox).toBeDefined();
      if (incomeCheckbox) {
        fireEvent.click(incomeCheckbox);
      }

      await waitFor(() => {
        expect(patchSpy).toHaveBeenCalledTimes(1);
        expect(patchSpy).toHaveBeenCalledWith(
          '/checklist/karnataka-vidyasiri-scholarship',
          { items: [{ label: 'Income Certificate', status: 'have' }] }
        );
      });
    });

    it('invokes window.print when print button is clicked', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockChecklistData }
      });

      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Print this list/i)).toBeDefined();
      });

      const printBtn = screen.getByRole('button', { name: /Print this list/i });
      fireEvent.click(printBtn);

      expect(printSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('displays error state when checklist API request fails', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Server error'));

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Checklist unavailable/i)).toBeDefined();
      });
    });
  });
});
