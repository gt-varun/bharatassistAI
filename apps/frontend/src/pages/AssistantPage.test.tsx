import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AssistantPage } from './AssistantPage';
import { AuthProvider } from '../auth/AuthContext';
import { apiClient, clearAuthTokens } from '../api/client';
import '../i18n/config';

describe('AssistantPage Component Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthTokens();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderComponent = (initialEntries = ['/assistant']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <AssistantPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('renders page header and openers when conversation is empty', () => {
    renderComponent(['/assistant']);

    expect(screen.getByText(/Ask the assistant/i)).toBeDefined();
    expect(screen.getByText(/Ask it the way you would ask a person/i)).toBeDefined();
    expect(screen.getByText(/What does "domicile certificate" mean\?/i)).toBeDefined();
  });

  it('sends question on opener click and displays grounded AI response with sources', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          conversationId: 'conv-456',
          message: {
            content: 'A domicile certificate proves that an applicant resides in a particular state.',
            sourceSchemeIds: ['karnataka-vidyasiri-scholarship']
          },
          sources: [
            {
              id: 'karnataka-vidyasiri-scholarship',
              slug: 'karnataka-vidyasiri-scholarship',
              name: 'Karnataka Vidyasiri Scholarship'
            }
          ],
          noMatch: false,
          intent: 'definition_query'
        }
      }
    } as any);

    renderComponent(['/assistant']);

    const opener = screen.getByText(/What does "domicile certificate" mean\?/i);
    fireEvent.click(opener);

    await waitFor(() => {
      expect(screen.getByText(/A domicile certificate proves that an applicant/i)).toBeDefined();
      expect(screen.getByText(/Karnataka Vidyasiri Scholarship/i)).toBeDefined();
    });
  });

  it('displays distinct no-match banner when query matches no verified scheme', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          conversationId: 'conv-789',
          message: {
            content: 'We could not find any verified government scheme matching your query.',
            sourceSchemeIds: []
          },
          sources: [],
          noMatch: true,
          intent: 'unknown_scheme'
        }
      }
    } as any);

    renderComponent(['/assistant']);

    const textarea = screen.getByPlaceholderText(/Ask about eligibility, documents/i);
    fireEvent.change(textarea, { target: { value: 'Is there a scheme for buying spaceships?' } });
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/No matching verified scheme found/i)).toBeDefined();
      expect(screen.getByText(/We could not find any verified government scheme/i)).toBeDefined();
    });
  });

  it('renders scoped scheme notification banner when scheme param is provided', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          name: 'Karnataka Vidyasiri Scholarship',
          slug: 'karnataka-vidyasiri-scholarship'
        }
      }
    } as any);

    renderComponent(['/assistant?scheme=karnataka-vidyasiri-scholarship']);

    await waitFor(() => {
      expect(screen.getByText(/Answering about/i)).toBeDefined();
      expect(screen.getByText(/Karnataka Vidyasiri Scholarship/i)).toBeDefined();
    });
  });
});
