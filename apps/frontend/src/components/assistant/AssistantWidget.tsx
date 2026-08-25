import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowUp,
  Bot,
  ExternalLink,
  Maximize2,
  MessagesSquare,
  X
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../ui/button';
import { MicButton, SpeakButton } from '../../voice';
import { cn } from '../../lib/utils';

interface MessageSource {
  id: string;
  slug: string;
  name: string;
}

interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: MessageSource[];
  noMatch?: boolean;
  failed?: boolean;
}

export const AssistantWidget: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // If citizen is currently on the full assistant page, hide the floating widget
  const isOnAssistantPage = location.pathname.startsWith('/assistant');
  const isOnWelcome = location.pathname.startsWith('/welcome');

  // Detect current scheme if browsing /schemes/:slug
  const schemeSlugMatch = location.pathname.match(/^\/schemes\/([^/]+)/);
  const currentSchemeSlug = schemeSlugMatch ? schemeSlugMatch[1] : undefined;

  useEffect(() => {
    if (isOpen) {
      if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      inputRef.current?.focus();
    }
  }, [isOpen, messages, pending]);

  // Handle ESC key to dismiss widget
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (isOnAssistantPage || isOnWelcome) {
    return null;
  }

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMessage: WidgetMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPending(true);

    try {
      const res = await apiClient.post('/assistant/message', {
        message: trimmed,
        schemeId: currentSchemeSlug,
        conversationId: conversationId ?? undefined,
        language: i18n.language
      });

      const payload = res.data?.data;
      if (payload?.conversationId) setConversationId(payload.conversationId);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: payload?.message?.content || 'No response returned from the assistant.',
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
          text: 'The assistant could not be reached right now. Please try again in a moment.',
          failed: true
        }
      ]);
    } finally {
      setPending(false);
    }
  };

  const quickOpeners = [
    'How do I check my scheme eligibility?',
    'What documents are needed for PM-Kisan?',
    'Scholarships for students in Karnataka'
  ];

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
      {/* -------------------- Floating Action Trigger -------------------- */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t('assistant.floatingButton') || 'Ask BharatAssist AI'}
          className="group flex items-center gap-2.5 rounded-full bg-sanction px-4 py-3 text-white shadow-focus transition-all duration-200 hover:scale-105 hover:bg-sanction/95 active:scale-95"
        >
          <div className="relative">
            <Bot className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-ping rounded-full bg-ochre opacity-75" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-ochre" />
          </div>
          <span className="hidden font-display text-[0.875rem] font-semibold sm:inline">
            {t('assistant.floatingButton') || 'Ask BharatAssist AI'}
          </span>
        </button>
      )}

      {/* -------------------- Floating Assistant Dialog -------------------- */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="assistant-widget-title"
          className="flex h-[32rem] max-h-[calc(100dvh-6rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-rule-strong bg-surface shadow-focus animate-in zoom-in-95 sm:max-w-md"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-rule bg-paper px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-sanction text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3
                  id="assistant-widget-title"
                  className="font-display text-[0.875rem] font-bold leading-tight text-ink"
                >
                  {t('assistant.floatingTitle') || 'BharatAssist AI Assistant'}
                </h3>
                <span className="font-mono text-micro text-ink-3">
                  Grounded in official scheme records
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                asChild
                title={t('assistant.openFullPage') || 'Open full page'}
                className="h-7 w-7 text-ink-3 hover:text-ink"
              >
                <Link
                  to={currentSchemeSlug ? `/assistant?scheme=${currentSchemeSlug}` : '/assistant'}
                  onClick={() => setIsOpen(false)}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label={t('assistant.closeWidget') || 'Close assistant'}
                className="h-7 w-7 text-ink-3 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Messages Stream */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-[0.875rem]">
            {messages.length === 0 ? (
              <div className="space-y-4 pt-2 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-sanction/10 text-sanction">
                  <MessagesSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-[0.9375rem] font-semibold text-ink">
                    How can BharatAssist help you?
                  </p>
                  <p className="mt-1 text-xs text-ink-2">
                    Ask any question about eligibility, benefits, or documents.
                  </p>
                </div>

                <div className="space-y-2 pt-2 text-left">
                  {quickOpeners.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => send(op)}
                      className="w-full rounded-lg border border-rule bg-paper p-2.5 text-xs text-ink-2 transition-colors hover:border-sanction hover:bg-sanction-tint hover:text-sanction"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex',
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[88%] rounded-xl px-3.5 py-2.5 leading-relaxed',
                      m.role === 'user'
                        ? 'bg-ink text-white'
                        : m.failed
                          ? 'border border-seal-edge bg-seal-tint text-seal'
                          : m.noMatch
                            ? 'border border-dashed border-ochre-edge bg-ochre-tint text-ochre'
                            : 'border border-rule bg-paper text-ink'
                    )}
                  >
                    {m.noMatch && (
                      <p className="mb-1.5 flex items-center gap-1 font-semibold text-xs text-ochre">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {t('assistant.noMatch') || 'No verified match found'}
                      </p>
                    )}

                    <p className="whitespace-pre-wrap">{m.text}</p>

                    {m.role === 'assistant' && !m.failed && (
                      <div className="mt-2 flex items-center justify-between border-t border-rule/40 pt-1.5">
                        <SpeakButton text={m.text} />

                        {m.sources && m.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {m.sources.map((s) => (
                              <Link
                                key={s.slug}
                                to={`/schemes/${s.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-0.5 rounded bg-sanction/10 px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium text-sanction hover:underline"
                              >
                                {s.name}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {pending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-lg border border-rule bg-paper px-3 py-2 text-xs text-ink-3">
                  <span>{t('assistant.checking') || 'Checking register…'}</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1 w-1 animate-pulse rounded-full bg-ink-4"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-rule bg-paper p-2.5"
          >
            <div className="flex items-center gap-1.5 rounded-lg border border-rule-strong bg-surface p-1.5 shadow-card focus-within:border-sanction">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('assistant.placeholder') || 'Ask a question…'}
                className="flex-1 bg-transparent px-2 text-[0.875rem] text-ink outline-none placeholder:text-ink-4"
              />

              <MicButton
                onResult={(spoken) =>
                  setInput((curr) => (curr ? `${curr} ${spoken}` : spoken))
                }
              />

              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || pending}
                className="h-8 w-8 shrink-0"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
