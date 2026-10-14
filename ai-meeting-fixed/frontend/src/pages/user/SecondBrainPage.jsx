import React, { useState, useRef, useEffect } from 'react';
import { Search, Brain, Send, Loader2, Bot, User, Sparkles, MessageSquare, History, Zap, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

async function askGroq(prompt, context, groqKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: 'You are the "Second Brain" of this meeting intelligence platform. You have access to the user\'s meeting transcripts provided in the context. Answer questions accurately based ONLY on the provided context. If the answer isn\'t in the context, say you don\'t know. Be concise and professional.' },
        { role: 'user', content: `Context from meetings:\n${context}\n\nQuestion: ${prompt}` }
      ]
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices[0].message.content;
}

export default function SecondBrainPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('groq_key') || '');
  const chatEndRef = useRef(null);

  const { data: transcriptions } = useQuery({
    queryKey: ['all-transcriptions'],
    queryFn: () => api.get('/transcriptions').then(r => r.data.data || []),
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    if (!groqKey) return toast.error('Please enter a Groq API key first');

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      // Gather context from all transcriptions
      const context = transcriptions?.map(t => `Meeting: ${t.meetingId?.title}\nTranscript: ${t.rawText.substring(0, 2000)}`).join('\n---\n') || '';

      const response = await askGroq(userMessage.content, context, groqKey);
      setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Meeting Second Brain</h1>
            <p className="text-xs text-slate-500">Ask anything across your entire meeting history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500" />
            <input
              type="password"
              className="input pl-9 text-xs w-48 focus:w-64 transition-all"
              placeholder="Groq API Key"
              value={groqKey}
              onChange={e => { setGroqKey(e.target.value); localStorage.setItem('groq_key', e.target.value); }}
            />
          </div>
          <button onClick={() => setMessages([])} className="btn-secondary p-2 rounded-lg" title="Clear chat">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Your Collective Intelligence</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ask questions like "What was decided about the dashboard last month?" or "Summarize the feedback Sarah gave on the pitch."
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full">
                {["Summarize key decisions from last week", "What are my pending action items?", "Compare the feedback from different clients"].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(suggestion); }}
                    className="text-xs text-left p-3 rounded-lg border border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all text-slate-600"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100' : 'bg-primary-600 text-white rounded-tr-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-xs text-slate-500 font-medium">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <form onSubmit={handleSend} className="relative">
            <input
              className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-shadow shadow-sm"
              placeholder="Ask your second brain..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:bg-slate-300"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-2 text-center flex items-center justify-center gap-1">
            <MessageSquare className="w-3 h-3" /> Powered by AI and your meeting history
          </p>
        </div>
      </div>
    </div>
  );
}
