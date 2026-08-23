import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EligibilityCheckerPage } from './EligibilityCheckerPage';
import { apiClient } from '../api/client';
import '../i18n/config';

describe('EligibilityCheckerPage Component Tests', () => {
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

  const renderWithProviders = (initialEntries = ['/eligibility?scheme=karnataka-vidyasiri-scholarship']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <EligibilityCheckerPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  const mockQuestionsData = {
    schemeId: 'karnataka-vidyasiri-scholarship',
    schemeName: 'Karnataka Vidyasiri Scholarship',
    questions: [
      {
        id: 'q_age',
        field: 'age',
        questionKey: 'eligibility.questions.age',
        question: 'What is your current age in completed years?',
        type: 'number',
        required: true,
        prefilled: true,
        currentValue: 20
      },
      {
        id: 'q_income',
        field: 'income',
        questionKey: 'eligibility.questions.income',
        question: 'What is your annual household income?',
        type: 'number',
        required: true,
        prefilled: false,
        currentValue: null
      }
    ]
  };

  describe('Initial rendering and loading', () => {
    it('shows loading state while fetching questions', () => {
      vi.spyOn(apiClient, 'get').mockReturnValue(new Promise(() => {}));
      renderWithProviders();
      expect(screen.getByText(/Loading scheme eligibility questions/i)).toBeDefined();
    });

    it('renders scheme header and question wizard when questions load', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockQuestionsData }
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Karnataka Vidyasiri Scholarship')).toBeDefined();
      });

      expect(screen.getByText(/Question 1 of 2/i)).toBeDefined();
      expect(screen.getByText(/Pre-filled from profile/i)).toBeDefined();
      expect(screen.getByDisplayValue('20')).toBeDefined();
    });
  });

  describe('Question navigation and form interaction', () => {
    it('allows navigating to the next question and submitting answers', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockQuestionsData }
      });

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            schemeId: 'karnataka-vidyasiri-scholarship',
            schemeName: 'Karnataka Vidyasiri Scholarship',
            status: 'eligible',
            reasons: ['Applicant age is within required 18–25 range.'],
            missingRequirements: [],
            alternativeSchemes: []
          }
        }
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 2/i)).toBeDefined();
      });

      // Click Next Question
      const nextBtn = screen.getByRole('button', { name: /Next Question/i });
      fireEvent.click(nextBtn);

      // Now on Question 2
      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 2/i)).toBeDefined();
      });

      // Enter income value
      const incomeInput = screen.getByPlaceholderText(/Enter a number/i);
      fireEvent.change(incomeInput, { target: { value: '150000' } });

      // Click Previous to go back to Question 1
      const prevBtn = screen.getByRole('button', { name: /Previous/i });
      fireEvent.click(prevBtn);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 2/i)).toBeDefined();
      });

      // Navigate forward again
      fireEvent.click(screen.getByRole('button', { name: /Next Question/i }));

      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 2/i)).toBeDefined();
      });

      // Submit final evaluation
      const checkBtn = screen.getByRole('button', { name: /Check Eligibility/i });
      fireEvent.click(checkBtn);

      await waitFor(() => {
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/You qualify for Karnataka Vidyasiri Scholarship/i)).toBeDefined();
      });

      expect(screen.getByText(/Applicant age is within required 18–25 range/i)).toBeDefined();
    });
  });

  describe('Eligibility outcomes and alternative schemes', () => {
    it('displays partially eligible result when criteria are incomplete', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            ...mockQuestionsData,
            questions: [mockQuestionsData.questions[0]]
          }
        }
      });

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            schemeId: 'karnataka-vidyasiri-scholarship',
            schemeName: 'Karnataka Vidyasiri Scholarship',
            status: 'partially_eligible',
            reasons: ['Age verified'],
            missingRequirements: ['Income documentation required'],
            alternativeSchemes: []
          }
        }
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Karnataka Vidyasiri Scholarship')).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Check Eligibility/i }));

      await waitFor(() => {
        expect(screen.getByText(/You partially meet requirements/i)).toBeDefined();
        expect(screen.getByText(/Income documentation required/i)).toBeDefined();
      });
    });

    it('displays not eligible result with alternative schemes when evaluation fails', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            ...mockQuestionsData,
            questions: [mockQuestionsData.questions[0]]
          }
        }
      });

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            schemeId: 'karnataka-vidyasiri-scholarship',
            schemeName: 'Karnataka Vidyasiri Scholarship',
            status: 'not_eligible',
            reasons: ['Household income exceeds limit.'],
            missingRequirements: ['Income under Rs 2,50,000'],
            alternativeSchemes: [
              {
                schemeId: 'national-merit-scholarship',
                schemeName: 'National Merit Scholarship',
                reasonRecommended: 'Supports higher annual household income limits up to Rs 5 Lakh',
                matchedCriteria: ['Student category matched']
              }
            ]
          }
        }
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Karnataka Vidyasiri Scholarship')).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Check Eligibility/i }));

      await waitFor(() => {
        expect(screen.getByText(/You do not currently qualify/i)).toBeDefined();
        expect(screen.getByText('Recommended Alternative Schemes')).toBeDefined();
        expect(screen.getByText('National Merit Scholarship')).toBeDefined();
        expect(screen.getByText(/Supports higher annual household income limits/i)).toBeDefined();
      });

      // Click Re-check Answers to return to wizard
      fireEvent.click(screen.getByRole('button', { name: /Re-check Answers/i }));

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of 1/i)).toBeDefined();
      });
    });
  });

  describe('Error handling', () => {
    it('renders error state when questions API request fails', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/Scheme questions unavailable/i)).toBeDefined();
      });
    });
  });
});
