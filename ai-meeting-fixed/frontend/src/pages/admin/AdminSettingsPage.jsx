import React, { useState } from 'react';
import { Settings, Send, Loader2, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'system', roles: [] });
  const [sending, setSending] = useState(false);

  const sendBroadcast = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post('/admin/broadcast', broadcast);
      toast.success(res.data.message);
      setBroadcast({ title: '', message: '', type: 'system', roles: [] });
    } catch { toast.error('Failed to send broadcast'); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Admin Settings</h1>

      {/* Broadcast */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-amber-400" /> Broadcast Notification
        </h3>
        <form onSubmit={sendBroadcast} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Title</label>
            <input className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="Notification title" required value={broadcast.title}
              onChange={e => setBroadcast(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Message</label>
            <textarea className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-200 rounded-lg text-sm focus:outline-none resize-none h-24"
              placeholder="Notification message..." required value={broadcast.message}
              onChange={e => setBroadcast(p => ({ ...p, message: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-300 rounded-lg text-sm focus:outline-none"
                value={broadcast.type} onChange={e => setBroadcast(p => ({ ...p, type: e.target.value }))}>
                <option value="system">System</option>
                <option value="mention">Announcement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Send to</label>
              <select className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-300 rounded-lg text-sm focus:outline-none"
                onChange={e => setBroadcast(p => ({ ...p, roles: e.target.value === 'all' ? [] : [e.target.value] }))}>
                <option value="all">All Users</option>
                <option value="user">Regular Users Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Broadcast</>}
          </button>
        </form>
      </div>

      {/* System config info */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" /> Platform Configuration
        </h3>
        <div className="space-y-3 text-sm">
          {[
            ['AI Model', 'OpenAI GPT-4 + Whisper-1'],
            ['Transcription Engine', 'OpenAI Whisper'],
            ['Max Upload Size', '500 MB'],
            ['Supported Formats', 'MP3, MP4, WAV, M4A, OGG, FLAC, WEBM'],
            ['Default Storage / User', '5 GB'],
            ['Rate Limit', '100 req / 15 min'],
          ].map(([k, v], i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
              <span className="text-slate-400">{k}</span>
              <span className="text-slate-300 text-xs font-mono bg-slate-900/50 px-2 py-0.5 rounded">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
