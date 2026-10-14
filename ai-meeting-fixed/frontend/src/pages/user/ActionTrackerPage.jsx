import React, { useState } from 'react';
import { CheckSquare, Plus, Sparkles, Zap, Clock, AlertTriangle, User, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';

async function askGroq(prompt, groqKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 600,
      messages: [{ role: 'system', content: 'Return only valid JSON array of tasks. No markdown.' }, { role: 'user', content: prompt }] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices[0].message.content;
}

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function ActionTrackerPage() {
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('groq_key') || '');
  const [filter, setFilter] = useState('all');
  const [aiText, setAiText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', dueDate: '' });
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['action-tasks', filter],
    queryFn: () => api.get('/tasks', { params: { status: filter === 'all' ? undefined : filter, limit: 100 } }).then(r => r.data.data || []),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries(['action-tasks']),
  });

  const createTask = useMutation({
    mutationFn: (data) => api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries(['action-tasks']); setNewTask({ title: '', priority: 'medium', dueDate: '' }); setShowAdd(false); toast.success('Task created!'); },
  });

  const extractFromText = async () => {
    if (!aiText.trim()) return toast.error('Paste some text first');
    if (!groqKey) return toast.error('Enter Groq API key');
    setGenerating(true);
    try {
      const raw = await askGroq(`Extract action items from this text. Return JSON array: [{title, priority, assignee, dueDate}]\nPriority: critical/high/medium/low\nDueDate: ISO date string or null\n\nText:\n${aiText}`, groqKey);
      const items = JSON.parse(raw.replace(/```json|```/g, '').trim());
      for (const item of items) {
        await api.post('/tasks', { title: item.title, priority: item.priority || 'medium', assignee: item.assignee || '', dueDate: item.dueDate || undefined });
      }
      qc.invalidateQueries(['action-tasks']);
      setAiText('');
      toast.success(`Extracted ${items.length} action items!`);
    } catch (err) { toast.error(err.message); }
    setGenerating(false);
  };

  const getDueBadge = (dueDate) => {
    if (!dueDate) return null;
    const d = new Date(dueDate);
    if (isPast(d)) return <span className="badge badge-red text-xs"><AlertTriangle className="w-3 h-3" /> Overdue</span>;
    if (isToday(d)) return <span className="badge badge-yellow text-xs"><Clock className="w-3 h-3" /> Today</span>;
    if (isTomorrow(d)) return <span className="badge badge-blue text-xs"><Clock className="w-3 h-3" /> Tomorrow</span>;
    return <span className="text-xs text-slate-400">{formatDistanceToNow(d, { addSuffix: true })}</span>;
  };

  const pending = tasks.filter(t => t.status !== 'completed').length;
  const done = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><CheckSquare className="w-6 h-6 text-primary-600" /> Action Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">AI-extracted tasks from meetings • Track completion across your team</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><div><p className="text-sm text-slate-500">Pending</p><p className="text-3xl font-bold text-amber-600">{pending}</p></div><CheckSquare className="w-6 h-6 text-amber-300" /></div>
        <div className="stat-card"><div><p className="text-sm text-slate-500">Completed</p><p className="text-3xl font-bold text-emerald-600">{done}</p></div><CheckSquare className="w-6 h-6 text-emerald-300" /></div>
        <div className="stat-card"><div><p className="text-sm text-slate-500">Completion Rate</p><p className="text-3xl font-bold text-primary-600">{tasks.length ? Math.round(done/tasks.length*100) : 0}%</p></div><CheckSquare className="w-6 h-6 text-primary-300" /></div>
      </div>

      {/* AI Extractor */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-slate-900">AI Action Item Extractor</h3>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <input type="password" className="input flex-1" placeholder="Groq API key (gsk_…)"
            value={groqKey} onChange={e => { setGroqKey(e.target.value); localStorage.setItem('groq_key', e.target.value); }} />
        </div>
        <textarea className="input h-24 resize-none mb-3" placeholder="Paste meeting notes, transcript excerpt, or any text with action items…"
          value={aiText} onChange={e => setAiText(e.target.value)} />
        <button onClick={extractFromText} disabled={generating} className="btn-primary">
          {generating ? 'Extracting…' : <><Sparkles className="w-4 h-4" /> Extract Action Items</>}
        </button>
      </div>

      {/* Add task */}
      {showAdd && (
        <div className="card p-5 border-primary-200 bg-primary-50/30">
          <h3 className="font-bold text-slate-900 mb-4">Add Manual Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <input className="input" placeholder="Task title" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
            </div>
            <select className="input" value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">⚪ Low</option>
            </select>
            <input className="input" type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <div className="flex gap-3 mt-3">
            <button onClick={() => createTask.mutate(newTask)} disabled={!newTask.title} className="btn-primary">Add Task</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'in-progress', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="card divide-y divide-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No tasks yet</p>
            <p className="text-sm text-slate-400 mt-1">Upload a meeting recording to auto-extract tasks with AI</p>
          </div>
        ) : tasks.map(task => (
          <div key={task._id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
            <input type="checkbox" checked={task.status === 'completed'}
              onChange={() => updateTask.mutate({ id: task._id, data: { status: task.status === 'completed' ? 'pending' : 'completed' } })}
              className="mt-1 w-4 h-4 accent-primary-600 cursor-pointer" />
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`badge border text-xs ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>{task.priority}</span>
                {task.aiExtracted && <span className="badge badge-purple text-xs">🤖 AI</span>}
                {task.dueDate && getDueBadge(task.dueDate)}
                {task.assignee && <span className="text-xs text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{task.assignee}</span>}
              </div>
            </div>
            <select className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white"
              value={task.status}
              onChange={e => updateTask.mutate({ id: task._id, data: { status: e.target.value } })}>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Done</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
