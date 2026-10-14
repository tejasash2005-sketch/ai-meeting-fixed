import React, { useState } from 'react';
import { Lightbulb, BarChart3, TrendingUp, Users, Clock, Zap, Sparkles, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

async function askGroq(prompt, groqKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 800,
      messages: [
        { role: 'system', content: 'You are a meeting analytics expert. Provide concise, actionable insights. Use bullet points. Be specific.' },
        { role: 'user', content: prompt }
      ] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices[0].message.content;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function MeetingInsightsPage() {
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('groq_key') || '');
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { data: meetings } = useQuery({
    queryKey: ['meetings-insights'],
    queryFn: () => api.get('/meetings', { params: { limit: 100 } }).then(r => r.data.data || []),
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks-insights'],
    queryFn: () => api.get('/tasks', { params: { limit: 100 } }).then(r => r.data.data || []),
  });

  const m = meetings || [];
  const t = tasks || [];

  // Compute stats
  const completed = m.filter(x => x.status === 'completed').length;
  const totalTasks = t.length;
  const doneTasks = t.filter(x => x.status === 'completed').length;
  const sentiments = { positive: 0, neutral: 0, negative: 0 };
  m.forEach(x => { if (x.aiInsights?.sentiment) sentiments[x.aiInsights.sentiment]++; });

  // Category distribution
  const catMap = {};
  m.forEach(x => { catMap[x.category || 'other'] = (catMap[x.category || 'other'] || 0) + 1; });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  // Weekly trend (last 8 weeks)
  const now = new Date();
  const weekData = Array.from({ length: 8 }, (_, i) => {
    const wk = new Date(now.getTime() - (7 - i) * 7 * 24 * 60 * 60 * 1000);
    const count = m.filter(x => {
      const d = new Date(x.createdAt);
      return d >= wk && d < new Date(wk.getTime() + 7 * 24 * 60 * 60 * 1000);
    }).length;
    return { week: `W${i+1}`, meetings: count };
  });

  // Sentiment data
  const sentimentData = Object.entries(sentiments).map(([name, value]) => ({ name, value }));

  const getAIInsight = async () => {
    if (!groqKey) return toast.error('Enter Groq API key');
    setLoadingInsight(true);
    try {
      const stats = `Total meetings: ${m.length}, Completed: ${completed}, Tasks: ${totalTasks} (${doneTasks} done), Sentiment: ${JSON.stringify(sentiments)}, Categories: ${JSON.stringify(catMap)}`;
      const reply = await askGroq(`Analyze these meeting statistics and give 5 specific, actionable insights:\n${stats}\n\nFocus on productivity patterns, areas for improvement, and concrete next steps.`, groqKey);
      setAiInsight(reply);
    } catch (err) { toast.error(err.message); }
    setLoadingInsight(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Lightbulb className="w-6 h-6 text-amber-500" /> Meeting Insights</h1>
          <p className="text-slate-500 text-sm mt-1">AI-powered analytics on your meeting patterns and productivity</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-500" />
          <input type="password" className="input flex-1" placeholder="Groq API key for AI analysis (gsk_…)"
            value={groqKey} onChange={e => { setGroqKey(e.target.value); localStorage.setItem('groq_key', e.target.value); }} />
          <button onClick={getAIInsight} disabled={loadingInsight} className="btn-primary whitespace-nowrap">
            {loadingInsight ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing…</> : <><Sparkles className="w-4 h-4" /> AI Analysis</>}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Meetings', value: m.length, icon: '📅', color: 'text-primary-600' },
          { label: 'Completed', value: completed, icon: '✅', color: 'text-emerald-600' },
          { label: 'Tasks Extracted', value: totalTasks, icon: '✅', color: 'text-amber-600' },
          { label: 'Task Completion', value: totalTasks ? `${Math.round(doneTasks/totalTasks*100)}%` : '—', icon: '📊', color: 'text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div>
              <p className="text-sm text-slate-500 font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
            <span className="text-2xl">{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4">Meetings Per Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="meetings" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4">Meetings by Category</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet</div>}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4">Sentiment Analysis</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sentimentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                {sentimentData.map((entry, i) => <Cell key={i} fill={entry.name === 'positive' ? '#10b981' : entry.name === 'negative' ? '#ef4444' : '#94a3b8'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> AI Insights
          </h3>
          {aiInsight ? (
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{aiInsight}</div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Lightbulb className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">Click "AI Analysis" to get personalized insights</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
