import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowUp, Info, MessagesSquare } from 'lucide-react';
import type { Scheme } from '@bharatassist/shared-types';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PageBody, PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

interface MessageSource {
  id: string;
  slug: string;
  name: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Records the answer was drawn from, so a claim can be traced. */
  sources?: MessageSource[];
  /** A distinct empty-state — this must never read like a normal answer. */
  noMatch?: boolean;
  failed?: boolean;
}

interface AssistantMessageResponse {
  conversationId: string | null;
  message: { content: string; sourceSchemeIds: string[] };
  sources: MessageSource[];
  noMatch: boolean;
  intent: string;
}

const OPENERS = [
  'What does "domicile certificate" mean?',
  'Which schemes help a farmer buy irrigation equipment?',
  'I earn ₹1.8 lakh a year — what scholarships can my daughter get?',
  'What is the difference between a subsidy and a direct benefit transfer?'
];

export const AssistantPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const schemeSlug = searchParams.get('scheme');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const hydratedHistory = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // When arriving from a scheme page, the conversation is scoped to it —
  // the backend anchors retrieval on this record ahead of a broader search.
  const { data: scopedScheme } = useQuery<Scheme | null>({
    queryKey: ['scheme', schemeSlug],
    queryFn: async () => {
      if (!schemeSlug) return null;
      const res = await apiClient.get(`/schemes/${schemeSlug}`);
      return res.data?.data ?? null;
    },
    enabled: Boolean(schemeSlug)
  });

  // Conversation history persists for signed-in citizens (PRD §11.10) — pick
  // up the most recently active conversation once, on arrival.
  const { data: recentConversations } = useQuery({
    queryKey: ['assistant-conversations'],
    queryFn: async () => {
      const res = await apiClient.get('/assistant/conversations', { params: { limit: 1 } });
      return res.data?.data?.conversations ?? [];
    },
    enabled: isAuthenticated && !schemeSlug,
    staleTime: 60 * 1000
  });

  useEffect(() => {
    if (hydratedHistory.current) return;
    const latest = recentConversations?.[0];
    if (!latest) return;
    hydratedHistory.current = true;

    apiClient
      .get(`/assistant/conversations/${latest._id}`)
      .then((res) => {
        const full = res.data?.data;
        if (!full?.messages?.length) return;
        setConversationId(full._id);
        setMessages(
          full.messages.map((m: any, i: number) => ({
            id: `${full._id}-${i}`,
            role: m.role,
            text: m.content,
            sources: undefined
          }))
        );
      })
      .catch(() => {
        /* History is a convenience — a failed hydration just starts fresh. */
      });
  }, [recentConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPending(true);

    try {
      const res = await apiClient.post<{ success: boolean; data: AssistantMessageResponse }>(
        '/assistant/message',
        {
          message: trimmed,
          schemeId: scopedScheme?.slug,
          conversationId: conversationId ?? undefined,
          language: i18n.language
        }
      );

      const payload = res.data?.data;
      if (payload?.conversationId) setConversationId(payload.conversationId);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: payload?.message?.content || 'No answer came back from the assistant.',
          sources: payload?.sources,
          noMatch: payload?.noMatch
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'The assistant is not reachable right now. Search the register directly and it will still answer with real records.',
          failed: true
        }
      ]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <PageBody className="flex min-h-[calc(100vh-3.5rem)] max-w-4xl flex-col">
      <PageHeader
        eyebrow={t('assistant.eyebrow')}
        title={t('assistant.title')}
        description={t('assistant.desc')}
      />

      {scopedScheme && (
        <p className="mt-5 flex flex-wrap items-center gap-2 rounded-md border border-sanction-edge bg-sanction-tint px-3.5 py-2.5 text-[0.875rem] text-sanction">
          <Info className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          Answering about{' '}
          <Link to={`/schemes/${scopedScheme.slug}`} className="font-semibold underline-offset-4 hover:underline">
            {scopedScheme.name}
          </Link>{' '}
          only.
        </p>
      )}

      {/* Conversation */}
      <div className="mt-8 flex-1">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-rule-strong bg-surface p-8 text-center">
            <MessagesSquare className="mx-auto h-6 w-6 text-ink-3" strokeWidth={1.5} />
            <p className="mt-3 font-display text-[1rem] font-semibold text-ink">
              Ask it the way you would ask a person
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-[0.875rem] leading-relaxed text-ink-2">
              Government wording is welcome but not needed. Try one of these to start.
            </p>
            <ul className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
              {OPENERS.map((opener) => (
                <li key={opener}>
                  <button
                    type="button"
                    onClick={() => send(opener)}
                    className="h-full w-full rounded-md border border-rule-strong bg-surface px-3.5 py-2.5 text-left text-[0.875rem] leading-relaxed text-ink-2 transition-colors hover:border-sanction hover:bg-sanction-tint hover:text-sanction"
                  >
                    {opener}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-5">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[42rem] rounded-lg px-4 py-3 text-[0.9375rem] leading-relaxed',
                    message.role === 'user'
                      ? 'bg-ink text-white'
                      : message.failed
                        ? 'border border-seal-edge bg-seal-tint text-seal'
                        : message.noMatch
                          ? 'border border-dashed border-ochre-edge bg-ochre-tint text-ochre'
                          : 'border border-rule bg-surface text-ink'
                  )}
                >
                  {message.noMatch && (
                    <p className="mb-2 flex items-center gap-1.5 register-strong text-ochre">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {t('assistant.noMatch')}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{message.text}</p>

                  {message.sources?.length ? (
                    <p className="hair-top mt-3 flex flex-wrap items-center gap-2 pt-2.5">
                      <span className="register">{t('assistant.drawnFrom')}</span>
                      {message.sources.map((source) => (
                        <Link
                          key={source.slug}
                          to={`/schemes/${source.slug}`}
                          className="font-mono text-micro text-sanction underline-offset-4 hover:underline"
                        >
                          {source.name}
                        </Link>
                      ))}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}

            {pending && (
              <li className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg border border-rule bg-surface px-4 py-3">
                  <span className="register">{t('assistant.checkingRegister')}</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-4"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              </li>
            )}
            <div ref={endRef} />
          </ul>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 mt-8 bg-paper pb-4 pt-2"
      >
        <div className="flex items-end gap-2 rounded-lg border border-rule-strong bg-surface p-2 shadow-card transition-[border-color,box-shadow] focus-within:border-sanction focus-within:shadow-focus">
          <label htmlFor="assistant-input" className="sr-only">
            Ask a question
          </label>
          <textarea
            ref={inputRef}
            id="assistant-input"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about eligibility, documents, or a word you don't recognise"
            className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-[0.9375rem] text-ink outline-none placeholder:text-ink-4"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || pending} aria-label="Send">
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-[0.8125rem] text-ink-3">
          The assistant explains records — it never decides your eligibility. That is calculated
          from the official rules.
        </p>
      </form>
    </PageBody>
  );
};
