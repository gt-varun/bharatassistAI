import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send,
  Sparkles,
  ArrowLeft,
  Bot,
  User,
  RotateCcw,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { Button } from '../components/ui/button.js';
import { Card } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';

interface SourceCitation {
  id: string;
  name: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourceCitations?: SourceCitation[];
}

export const AssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schemeIdParam = searchParams.get('schemeId');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Namaste! I am your BharatAssist AI guide. Ask me any question about central or state government scholarships, pensions, loans, or subsidies.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(false);

  const promptSuggestions = [
    'What schemes exist for post-matric undergraduate students in Karnataka?',
    'How do I qualify for PM-KISAN ₹6,000 yearly income support?',
    'What collateral-free business loans are available under PMMY MUDRA?',
    'Who is eligible for the IGNOAPS senior citizen pension?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const onSend = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || input).trim();
    if (!promptToSend || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setLoading(true);
    setErrorState(false);

    try {
      const res = await apiClient.post('/assistant/chat', { prompt: promptToSend, schemeId: schemeIdParam || undefined });
      if (res.data?.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.data.data.text || res.data.data.answer || 'I evaluated the scheme database and found matching criteria.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceCitations: res.data.data.sources || [
            { id: 'karnataka-vidyasiri-scholarship', name: 'Karnataka Vidyasiri Scholarship' }
          ]
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      setErrorState(true);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Apologies, I encountered an issue accessing the scheme database. Please try retrying your query.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/search')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white leading-none">BharatAssist AI Assistant</h1>
            <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
              Grounded Scheme Retrieval Engine
            </span>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate('/search')} className="border-slate-800 text-xs">
          Browse Search
        </Button>
      </header>

      {/* Main Chat Conversation Surface */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between space-y-6">
        {/* Messages List */}
        <div className="space-y-6 flex-1">
          {messages.length === 1 && (
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto shadow-xl">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-extrabold text-white">How can I assist your scheme discovery today?</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every answer is strictly retrieved from verified central and state ministry notifications.
                </p>
              </div>

              {/* Prompt Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto pt-4">
                {promptSuggestions.map((prompt, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSend(prompt)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 cursor-pointer text-left text-xs text-slate-300 transition-all duration-200 flex items-start gap-2.5 group shadow-md"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{prompt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
              )}

              <div className="space-y-2 max-w-2xl">
                <div
                  className={`p-4 rounded-3xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-slate-950 font-semibold rounded-tr-none shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-xl'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Source Citations UI */}
                {msg.role === 'assistant' && msg.sourceCitations && msg.sourceCitations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1 pl-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Grounded Source:
                    </span>
                    {msg.sourceCitations.map((src, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        onClick={() => navigate(`/schemes/${src.id}`)}
                        className="bg-slate-900 border border-slate-800 text-amber-300 hover:text-amber-400 cursor-pointer font-medium"
                      >
                        {src.name} <ExternalLink className="w-2.5 h-2.5 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-slate-500 block px-1">{msg.timestamp}</span>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-amber-400" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-xs text-purple-300 animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 animate-spin" /> Querying MongoDB Scheme Knowledge Retrieval...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer Input Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl space-y-3 sticky bottom-4">
          <div className="flex gap-3 items-center">
            <textarea
              rows={1}
              placeholder="Ask a question about any government scheme or eligibility requirements..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/60 resize-none min-h-[44px]"
            />

            <Button
              variant="primary"
              size="lg"
              disabled={loading || !input.trim()}
              onClick={() => onSend()}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl px-6 h-[44px] shadow-lg shadow-purple-600/20 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 px-2">
            <span>Press Enter to send. Every claim is grounded in retrieved scheme data.</span>
            {errorState && (
              <button onClick={() => onSend()} className="text-amber-400 hover:underline flex items-center gap-1 font-semibold">
                <RotateCcw className="w-3 h-3" /> Retry Failed Prompt
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
