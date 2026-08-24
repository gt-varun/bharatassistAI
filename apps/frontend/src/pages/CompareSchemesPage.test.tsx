import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CompareSchemesPage } from './CompareSchemesPage';
import { apiClient } from '../api/client';
import '../i18n/config';

describe('CompareSchemesPage Component Tests', () => {
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

  const renderWithProviders = (
    initialEntries = ['/compare?schemes=karnataka-vidyasiri-scholarship,post-matric-scholarship-sc']
  ) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <CompareSchemesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  const mockCompareData = {
    schemes: [
      {
        schemeId: '665f1a2b3c4d5e6f7a8b9001',
        schemeName: 'Karnataka Vidyasiri Scholarship',
        slug: 'karnataka-vidyasiri-scholarship',
        department: 'Department of Collegiate Education',
        level: 'state',
        state: 'Karnataka',
        eligibilitySummary: 'Open to Karnataka students with family income under 2.5L',
        requiredDocuments: ['Income Certificate', 'Bonafide'],
        requiredDocumentsCount: 2,
        benefits: 'Full tuition reimbursement',
        benefitType: 'subsidy',
        applicationDeadline: '2026-10-31',
        applicationMode: 'online',
        officialPortalUrl: 'https://vidyasiri.karnataka.gov.in'
      },
      {
        schemeId: '665f1a2b3c4d5e6f7a8b9002',
        schemeName: 'Post-Matric Scholarship for SC Students',
        slug: 'post-matric-scholarship-sc',
        department: 'Ministry of Social Justice',
        level: 'central',
        state: 'Central (All States)',
        eligibilitySummary: 'Open to SC students nationwide with family income under 2.5L',
        requiredDocuments: ['Caste Certificate', 'Income Certificate', 'Bonafide'],
        requiredDocumentsCount: 3,
        benefits: 'Maintenance allowance and tuition fee support',
        benefitType: 'subsidy',
        applicationDeadline: 'Rolling / Open',
        applicationMode: 'online',
        officialPortalUrl: 'https://scholarships.gov.in'
      }
    ],
    differingFields: ['state', 'level', 'requiredDocumentsCount', 'applicationDeadline'],
    differences: {
      state: true,
      level: true,
      requiredDocumentsCount: true,
      applicationDeadline: true,
      benefitType: false,
      applicationMode: false
    }
  };

  describe('Initial rendering and scheme selection', () => {
    it('renders selection screen when fewer than 2 schemes are specified', () => {
      renderWithProviders(['/compare?schemes=karnataka-vidyasiri-scholarship']);
      expect(screen.getByText(/Save at least 2 schemes to compare/i)).toBeDefined();
    });

    it('shows loading state while comparison is being fetched', () => {
      vi.spyOn(apiClient, 'post').mockReturnValue(new Promise(() => {}));
      renderWithProviders();
      expect(screen.getByText(/Comparing selected schemes/i)).toBeDefined();
    });
  });

  describe('Comparison matrix and difference highlighting', () => {
    it('renders side-by-side comparison table with scheme criteria and values', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { success: true, data: mockCompareData }
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getAllByText('Karnataka Vidyasiri Scholarship').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Post-Matric Scholarship for SC Students').length).toBeGreaterThan(0);
      });

      // Verification of table rows
      expect(screen.getAllByText('Full tuition reimbursement').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Maintenance allowance and tuition fee support').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2026-10-31').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Rolling / Open').length).toBeGreaterThan(0);

      // Difference banner
      expect(screen.getByText(/4 key differences detected/i)).toBeDefined();

      // Official portal links rendered
      const portalLinks = screen.getAllByRole('link', { name: /Official Portal/i });
      expect(portalLinks.length).toBeGreaterThanOrEqual(2);
      expect(portalLinks[0].getAttribute('href')).toBe('https://vidyasiri.karnataka.gov.in');
      expect(portalLinks[1].getAttribute('href')).toBe('https://scholarships.gov.in');
    });

    it('allows changing selection and clearing compare list', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: { success: true, data: mockCompareData }
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getAllByText('Karnataka Vidyasiri Scholarship').length).toBeGreaterThan(0);
      });

      const changeBtn = screen.getByRole('button', { name: /Change selection/i });
      fireEvent.click(changeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Save at least 2 schemes to compare/i)).toBeDefined();
      });
    });
  });

  describe('Error handling', () => {
    it('displays error state when compare API request fails', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Comparison failed'));

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Unable to compare schemes/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Clear selection/i })).toBeDefined();
      });
    });
  });
});
