import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantWidget } from './AssistantWidget';
import { apiClient } from '../../api/client';
import '../../i18n/config';

describe('AssistantWidget Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWidget = (initialEntries = ['/dashboard']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AssistantWidget />
      </MemoryRouter>
    );
  };

  it('renders floating action button on regular pages', () => {
    renderWidget(['/dashboard']);
    expect(screen.getByRole('button', { name: /Ask BharatAssist AI/i })).toBeDefined();
  });

  it('does not render floating button when on /assistant page', () => {
    renderWidget(['/assistant']);
    expect(screen.queryByRole('button', { name: /Ask BharatAssist AI/i })).toBeNull();
  });

  it('opens dialog when trigger button is clicked', async () => {
    renderWidget(['/dashboard']);

    const trigger = screen.getByRole('button', { name: /Ask BharatAssist AI/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText(/BharatAssist AI Assistant/i)).toBeDefined();
    });
  });

  it('sends user message and displays grounded AI response with source schemes', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          conversationId: 'test-conv-123',
          message: {
            content: 'PM-Kisan provides ₹6,000 yearly in three equal installments to eligible farmers.',
            sourceSchemeIds: ['pm-kisan-samman-nidhi']
          },
          sources: [
            {
              id: 'pm-kisan-samman-nidhi',
              slug: 'pm-kisan-samman-nidhi',
              name: 'PM Kisan Samman Nidhi'
            }
          ],
          noMatch: false,
          intent: 'scheme_inquiry'
        }
      }
    } as any);

    renderWidget(['/dashboard']);

    // Open widget
    fireEvent.click(screen.getByRole('button', { name: /Ask BharatAssist AI/i }));

    const input = await screen.findByPlaceholderText(/Ask a question/i);
    fireEvent.change(input, { target: { value: 'Tell me about PM Kisan' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/PM-Kisan provides ₹6,000 yearly/i)).toBeDefined();
      expect(screen.getByText(/PM Kisan Samman Nidhi/i)).toBeDefined();
    });
  });

  it('closes dialog when close button is clicked', async () => {
    renderWidget(['/dashboard']);

    fireEvent.click(screen.getByRole('button', { name: /Ask BharatAssist AI/i }));

    const closeBtn = await screen.findByRole('button', { name: /Close assistant/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('button', { name: /Ask BharatAssist AI/i })).toBeDefined();
    });
  });
});
