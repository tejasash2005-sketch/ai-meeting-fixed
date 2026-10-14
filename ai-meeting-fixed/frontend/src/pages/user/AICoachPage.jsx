import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, Sparkles, Target, TrendingUp, MessageCircle, Zap, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

const GROQ_SYSTEM = `You are an expert AI Meeting Coach. You analyze meeting patterns, communication styles, and productivity metrics to give actionable, specific advice. You help users become better communicators, run more effective meetings, and extract maximum value from their discussions. Be concise, practical, and encouraging. Use bullet points and clear structure.`;

async function askGroq(messages, groqKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1000, messages }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices[0].message.content;
}

const QUICK_PROMPTS = [
  { icon: '🎯', label: 'Improve my meeting focus', prompt: 'How can I keep my meetings more focused and on-agenda?' },
  { icon: '⏱️', label: 'Shorter meetings', prompt: 'What techniques help make meetings shorter without losing value?' },
  { icon: '💬', label: 'Better communication', prompt: 'How do I communicate more clearly in meetings?' },
  { icon: '✅', label: 'More action items', prompt: 'How do I ensure meetings always produce clear, assigned action items?' },
  { icon: '🤝', label: 'Engage participants', prompt: 'How do I get quiet participants to contribute more?' },
  { icon: '📊', label: 'Analyze my patterns', prompt: 'Based on typical meeting patterns, what should I improve?' },
];

export default function AICoachPage() {
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('groq_key') || '');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "👋 Hi! I'm your AI Meeting Coach powered by Llama 3.3. I can help you run better meetings, improve communication, and extract more value from your discussions.\n\nTry a quick prompt below or ask me anything about meeting productivity!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    if (!groqKey) { toast.error('Enter your Groq API key above'); return; }
    setInput('');
    const newHistory = [...history, { role: 'user', content: msg }];
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const reply = await askGroq([{ role: 'system', content: GROQ_SYSTEM }, ...newHistory], groqKey);
      setHistory([...newHistory, { role: 'assistant', content: reply }]);
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-5 animate-fade-in h-full flex flex-col">
      <div className="page-header flex-shrink-0">
        <div>
          <h1 className="page-title flex items-center gap-2"><Brain className="w-6 h-6 text-primary-600" /> AI Meeting Coach</h1>
          <p className="text-slate-500 text-sm mt-1">Personal AI coach for better meetings • Powered by Groq + Llama 3.3</p>
        </div>
      </div>

      {/* Groq key */}
      <div className="card p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <input type="password" className="input flex-1" placeholder="Groq API key (gsk_…) — free at console.groq.com"
            value={groqKey} onChange={e => { setGroqKey(e.target.value); localStorage.setItem('groq_key', e.target.value); }} />
        </div>
      </div>

      {/* Quick prompts */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-shrink-0">
        {QUICK_PROMPTS.map((q, i) => (
          <button key={i} onClick={() => send(q.prompt)}
            className="card p-3 text-left hover:border-primary-300 hover:shadow-sm transition-all group">
            <span className="text-lg">{q.icon}</span>
            <p className="text-xs font-medium text-slate-700 mt-1 group-hover:text-primary-700">{q.label}</p>
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary-100' : 'bg-amber-100'}`}>
                {m.role === 'user' ? '👤' : '🧠'}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">🧠</div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} /></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-slate-100 p-3 flex gap-2">
          <input className="input flex-1" placeholder="Ask your meeting coach anything…" value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary px-4">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
