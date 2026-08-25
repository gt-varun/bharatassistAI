import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AiOnboardingPage } from './AiOnboardingPage';
import { wasOnboardingSkipped } from './useOnboarding';
import '../i18n/config';

describe('AiOnboardingPage Component Tests', () => {
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
          <AiOnboardingPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders initial language question and options', async () => {
    renderComponent();

    expect(screen.getByText(/AI Assistant Setup/i)).toBeDefined();
    expect(screen.getByText(/Which language do you read\?/i)).toBeDefined();
    expect(screen.getAllByText(/English/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/हिन्दी/i)).toBeDefined();
  });

  it('selects language and advances to name question', async () => {
    renderComponent();

    const englishButton = screen.getByRole('button', { name: /English/i });
    fireEvent.click(englishButton);

    await waitFor(() => {
      expect(screen.getByText(/What should we call you\?/i)).toBeDefined();
    });
  });

  it('enters name, presents confirmation step, and advances to state question on confirm', async () => {
    renderComponent();

    // 1. Language step
    fireEvent.click(screen.getByRole('button', { name: /English/i }));

    // 2. Name step
    await waitFor(() => {
      expect(screen.getByText(/What should we call you\?/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Your name/i);
    fireEvent.change(input, { target: { value: 'Ramesh Kumar' } });
    fireEvent.submit(input.closest('form')!);

    // Confirmation interstitial step
    await waitFor(() => {
      expect(screen.getByText(/We understood.*Ramesh Kumar/i)).toBeDefined();
    });

    const confirmButton = screen.getByRole('button', { name: /Yes, correct/i });
    fireEvent.click(confirmButton);

    // 3. State step
    await waitFor(() => {
      expect(screen.getByText(/Which state do you live in\?/i)).toBeDefined();
    });
  });

  it('opens assisted support modal when Need help is clicked', async () => {
    renderComponent();

    const needHelpButton = screen.getAllByRole('button', { name: /Need help\?/i })[0];
    fireEvent.click(needHelpButton);

    await waitFor(() => {
      expect(screen.getByText(/Assisted Help & Support/i)).toBeDefined();
      expect(screen.getByText(/Nearby Common Service Centre/i)).toBeDefined();
      expect(screen.getByText(/Village Volunteer \/ Gram Panchayat/i)).toBeDefined();
    });

    const closeHelp = screen.getByRole('button', { name: /Back to conversation/i });
    fireEvent.click(closeHelp);

    await waitFor(() => {
      expect(screen.queryByText(/Assisted Help & Support/i)).toBeNull();
    });
  });

  it('allows skipping onboarding via Fill this in later', async () => {
    renderComponent();

    const skipButton = screen.getByRole('button', { name: /Fill this in later/i });
    fireEvent.click(skipButton);

    expect(wasOnboardingSkipped()).toBe(true);
  });
});
