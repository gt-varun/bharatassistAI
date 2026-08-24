import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SchemeDetailsPage } from './SchemeDetailsPage';
import { AuthProvider } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import '../i18n/config';

describe('SchemeDetailsPage Component Tests', () => {
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

  const renderWithProviders = (slug = 'karnataka-vidyasiri-scholarship') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[`/schemes/${slug}`]}>
            <Routes>
              <Route path="/schemes/:idOrSlug" element={<SchemeDetailsPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  const mockScheme = {
    _id: '665f1a2b3c4d5e6f7a8b9001',
    name: 'Karnataka Vidyasiri Scholarship',
    slug: 'karnataka-vidyasiri-scholarship',
    department: 'Department of Collegiate Education',
    level: 'state',
    state: 'Karnataka',
    shortDescription: 'Post-matric scholarship for students in Karnataka',
    fullDescription: 'Full detailed description of Vidyasiri scheme.',
    targetSegments: ['student'],
    benefitType: 'subsidy',
    benefitSummary: 'Full tuition fee reimbursement',
    status: 'open',
    applicationMode: 'online',
    officialPortalUrl: 'https://vidyasiri.karnataka.gov.in',
    sourceRef: 'Govt Order ED 2026',
    lastVerifiedAt: '2026-08-01T00:00:00.000Z',
    eligibilityRules: {
      state: ['Karnataka'],
      ageMin: 18,
      ageMax: 25,
      incomeMax: 250000,
      occupationCategory: ['student']
    },
    eligibilitySummaryPlain: 'Open to Karnataka undergraduate students with family income under ₹2.5 Lakh.',
    requiredDocuments: [
      { label: 'Income Certificate', howToObtain: 'Taluk Office', mandatory: true },
      { label: 'Aadhaar Card', howToObtain: 'UIDAI', mandatory: true }
    ],
    applicationFields: [
      { fieldName: 'Student Aadhaar Number', instructions: 'Enter 12-digit Aadhaar', mandatory: true }
    ],
    commonMistakes: ['Submitting expired income certificates']
  };

  const mockGuidance = {
    fieldByFieldGuidance: [
      { fieldName: 'Student Aadhaar Number', instructions: 'Enter 12-digit Aadhaar', mandatory: true }
    ],
    commonMistakes: ['Submitting expired income certificates'],
    glossary: [
      { term: 'Aadhaar Seeding', definition: 'Linking Aadhaar to bank account' }
    ],
    officialPortalUrl: 'https://vidyasiri.karnataka.gov.in',
    portalValid: true,
    readyToApply: true
  };

  it('renders scheme header, benefit summary, and action CTAs', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/guidance/')) {
        return { data: { success: true, data: mockGuidance } };
      }
      return { data: { success: true, data: mockScheme } };
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Karnataka Vidyasiri Scholarship')).toBeDefined();
    });

    expect(screen.getAllByText('Department of Collegiate Education').length).toBeGreaterThan(0);
    expect(screen.getByText('Full tuition fee reimbursement')).toBeDefined();

    // Check Eligibility CTA
    expect(screen.getAllByText(/Check my eligibility/i).length).toBeGreaterThan(0);

    // Save scheme CTA
    expect(screen.getByText(/Save this scheme/i)).toBeDefined();

    // Verified official portal link
    expect(screen.getByText(/Apply on the official portal/i)).toBeDefined();
  });

  it('renders Overview tab content and allows switching tab panels', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/guidance/')) {
        return { data: { success: true, data: mockGuidance } };
      }
      return { data: { success: true, data: mockScheme } };
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('Karnataka Vidyasiri Scholarship')).toBeDefined();
    });

    // Default Overview tab is active
    expect(screen.getByText('Full detailed description of Vidyasiri scheme.')).toBeDefined();
    expect(screen.getByText('State — Karnataka')).toBeDefined();

    // Tabs exist
    expect(screen.getByRole('tab', { name: /Eligibility/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Documents/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /How to apply/i })).toBeDefined();
  });

  it('renders not found state when scheme is missing', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Not found'));

    renderWithProviders('unknown-scheme');

    await waitFor(() => {
      expect(screen.getByText(/That scheme is not on the register/i)).toBeDefined();
    });
  });
});
