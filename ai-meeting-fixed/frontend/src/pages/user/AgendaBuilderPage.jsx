import React, { useState } from 'react';
import { ListOrdered, Sparkles, Plus, Trash2, GripVertical, Clock, Download, Copy, Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

async function askGroq(prompt, groqKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1200,
      messages: [
        { role: 'system', content: 'You are an expert meeting facilitator. Generate structured, time-boxed meeting agendas in valid JSON only. No markdown, no explanation, just JSON.' },
        { role: 'user', content: prompt }
      ] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices[0].message.content;
}

const TEMPLATES = [
  { name: 'Weekly Standup', duration: 15, goal: 'Team sync on progress, blockers, and priorities' },
  { name: 'Sprint Planning', duration: 60, goal: 'Plan the upcoming sprint with stories and estimates' },
  { name: 'Client Presentation', duration: 45, goal: 'Present project status and gather client feedback' },
  { name: 'Retrospective', duration: 60, goal: 'Review what went well, what to improve, action items' },
  { name: 'Brainstorm Session', duration: 45, goal: 'Generate and evaluate ideas for a specific challenge' },
  { name: 'One-on-One', duration: 30, goal: 'Manager/report sync on career, projects, and blockers' },
];

export default function AgendaBuilderPage() {
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('groq_key') || '');
  const [form, setForm] = useState({ title: '', goal: '', duration: '30', participants: '', context: '' });
  const [items, setItems] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!form.title || !form.goal) return toast.error('Title and goal are required');
    if (!groqKey) return toast.error('Enter your Groq API key');
    setGenerating(true);
    try {
      const prompt = `Create a meeting agenda for:\nTitle: ${form.title}\nGoal: ${form.goal}\nDuration: ${form.duration} minutes\nParticipants: ${form.participants || 'Not specified'}\nContext: ${form.context || 'N/A'}\n\nReturn JSON array: [{title, duration_minutes, description, facilitator_tip, type}]\nTypes: opening, discussion, decision, update, brainstorm, action_items, closing\nMake it realistic and time-boxed. Total must equal ${form.duration} minutes.`;
      const raw = await askGroq(prompt, groqKey);
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setItems(parsed.map((it, i) => ({ ...it, id: i })));
      toast.success(`Agenda built with ${parsed.length} items!`);
    } catch (err) { toast.error('Failed: ' + err.message); }
    setGenerating(false);
  };

  const addItem = () => setItems(p => [...p, { id: Date.now(), title: 'New Item', duration_minutes: 5, description: '', type: 'discussion' }]);
  const removeItem = (id) => setItems(p => p.filter(it => it.id !== id));
  const updateItem = (id, field, val) => setItems(p => p.map(it => it.id === id ? { ...it, [field]: val } : it));

  const totalMin = items.reduce((s, it) => s + (parseInt(it.duration_minutes) || 0), 0);

  const exportText = () => {
    const lines = [`# ${form.title || 'Meeting Agenda'}`, `Goal: ${form.goal}`, `Duration: ${totalMin} min`, '', ...items.map((it, i) => `${i+1}. ${it.title} (${it.duration_minutes}min)\n   ${it.description || ''}`)];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success('Agenda copied to clipboard!');
  };

  const TYPE_COLORS = { opening:'bg-emerald-100 text-emerald-700', discussion:'bg-blue-100 text-blue-700', decision:'bg-purple-100 text-purple-700', update:'bg-amber-100 text-amber-700', brainstorm:'bg-pink-100 text-pink-700', action_items:'bg-orange-100 text-orange-700', closing:'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ListOrdered className="w-6 h-6 text-primary-600" /> Smart Agenda Builder</h1>
          <p className="text-slate-500 text-sm mt-1">AI-generated, time-boxed meeting agendas in seconds</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-500" />
          <input type="password" className="input flex-1" placeholder="Groq API key (gsk_…)"
            value={groqKey} onChange={e => { setGroqKey(e.target.value); localStorage.setItem('groq_key', e.target.value); }} />
        </div>
      </div>

      {/* Templates */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Quick templates:</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button key={t.name} onClick={() => setForm(p => ({ ...p, title: t.name, goal: t.goal, duration: String(t.duration) }))}
              className="text-xs bg-slate-100 hover:bg-primary-100 hover:text-primary-700 text-slate-600 px-3 py-1.5 rounded-full transition-colors font-medium">
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Meeting Title *</label>
          <input className="input" placeholder="e.g. Q2 Planning Session" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Duration (minutes) *</label>
          <select className="input" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}>
            {[15,30,45,60,90,120].map(d => <option key={d} value={d}>{d} minutes</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Meeting Goal *</label>
          <input className="input" placeholder="What should be achieved by end of this meeting?" value={form.goal} onChange={e => setForm(p => ({ ...p, goal: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Participants</label>
          <input className="input" placeholder="e.g. Engineering team, Product Manager" value={form.participants} onChange={e => setForm(p => ({ ...p, participants: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Additional Context</label>
          <input className="input" placeholder="e.g. Q2 just started, team of 8" value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button onClick={generate} disabled={generating} className="btn-primary flex-1">
            {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate AI Agenda</>}
          </button>
          <button onClick={addItem} className="btn-secondary"><Plus className="w-4 h-4" /> Add Item</button>
        </div>
      </div>

      {/* Agenda items */}
      {items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-900">Agenda</h2>
              <span className={`badge ${totalMin > parseInt(form.duration) ? 'badge-red' : 'badge-green'}`}>
                <Clock className="w-3 h-3" /> {totalMin} / {form.duration} min
              </span>
            </div>
            <button onClick={exportText} className="btn-secondary text-sm">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((item, i) => (
              <div key={item.id} className="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold mt-0.5">{i+1}</div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input className="font-semibold text-slate-900 bg-transparent border-none outline-none focus:bg-slate-100 rounded px-1 flex-1 min-w-32" value={item.title} onChange={e => updateItem(item.id, 'title', e.target.value)} />
                    <span className={`badge text-xs ${TYPE_COLORS[item.type] || 'badge-gray'}`}>{item.type}</span>
                  </div>
                  {item.description && <p className="text-sm text-slate-600">{item.description}</p>}
                  {item.facilitator_tip && <p className="text-xs text-primary-600 bg-primary-50 rounded px-2 py-1">💡 {item.facilitator_tip}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <input type="number" className="w-10 bg-transparent text-sm text-center outline-none" value={item.duration_minutes} onChange={e => updateItem(item.id, 'duration_minutes', e.target.value)} />
                    <span className="text-xs text-slate-500">min</span>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RefreshCw(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
