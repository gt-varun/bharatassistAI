import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Namaste! I am your BharatAssist AI guide. Ask me any question about government scholarships, pensions, loans, or subsidies.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await apiClient.post('/assistant/chat', { prompt: userMsg });
      if (res.data?.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data.data.text }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Apologies, I encountered an error connecting to the assistant service.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 max-w-4xl mx-auto flex flex-col">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">BharatAssist AI Assistant</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/search')}>Search Schemes</Button>
      </header>

      <div className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 overflow-y-auto space-y-4 mb-4 min-h-[400px]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-lg p-3.5 rounded-xl text-sm ${
                msg.role === 'user'
                  ? 'bg-amber-600 text-white rounded-br-none'
                  : 'bg-slate-700 text-slate-100 rounded-bl-none border border-slate-600'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-300 p-3 rounded-xl text-xs animate-pulse">
              Gemini AI is analyzing schemes...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Ask a question (e.g. What schemes exist for undergraduate students in Karnataka?)"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && onSend()}
        />
        <Button variant="primary" onClick={onSend} disabled={loading} className="flex items-center gap-2">
          <Send className="w-4 h-4" /> Send
        </Button>
      </div>
    </div>
  );
};
