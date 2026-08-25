import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingChoicePage } from './OnboardingChoicePage';
import { apiClient } from '../api/client';
import { wasOnboardingSkipped } from './useOnboarding';
import '../i18n/config';

describe('OnboardingChoicePage Component Tests', () => {
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
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { data: null }
    } as any);

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OnboardingChoicePage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders both AI-assisted setup and manual setup cards', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/AI-assisted setup/i)).toBeDefined();
      expect(screen.getByText(/Manual setup/i)).toBeDefined();
    });

    expect(screen.getByRole('link', { name: /AI-assisted setup/i }).getAttribute('href')).toBe('/welcome/ai');
    expect(screen.getByRole('link', { name: /Manual setup/i }).getAttribute('href')).toBe('/welcome/manual');
  });

  it('renders skip for now button and marks onboarding skipped when clicked', async () => {
    renderComponent();

    const skipButton = await screen.findByRole('button', { name: /Fill this in later/i });
    expect(skipButton).toBeDefined();

    fireEvent.click(skipButton);
    expect(wasOnboardingSkipped()).toBe(true);
  });
});

