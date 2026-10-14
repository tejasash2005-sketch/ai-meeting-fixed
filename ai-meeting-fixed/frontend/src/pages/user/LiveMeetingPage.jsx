import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Users,
  Copy, Check, Share2, Settings, Monitor, Hand, MoreVertical,
  Plus, LogIn, ArrowLeft, Shield, Clock, Wifi
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// ── Create Room Modal ─────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', password: '', waitingRoom: false, muteOnEntry: false });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error('Meeting title required');
    setLoading(true);
    try {
      const res = await api.post('/live/create', {
        title: form.title,
        password: form.password || null,
        settings: { waitingRoom: form.waitingRoom, muteOnEntry: form.muteOnEntry, allowChat: true }
      });
      onCreated(res.data.data);
    } catch { toast.error('Failed to create meeting'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-5">Create New Meeting</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Meeting Title *</label>
            <input className="input" placeholder="e.g. Weekly Standup" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Password (optional)</label>
            <input className="input" type="password" placeholder="Leave empty for no password"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-700">Mute participants on entry</p>
              <p className="text-xs text-slate-500">Everyone starts muted</p>
            </div>
            <button onClick={() => setForm(p => ({ ...p, muteOnEntry: !p.muteOnEntry }))}
              className={`w-11 h-6 rounded-full transition-colors ${form.muteOnEntry ? 'bg-primary-600' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.muteOnEntry ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Creating…' : '🎥 Create Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Join Room Modal ────────────────────────────────────────────────────────────
function JoinRoomModal({ onClose }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!code.trim()) return toast.error('Enter a room code');
    setLoading(true);
    try {
      const res = await api.post('/live/join', { roomCode: code.trim().toUpperCase(), password });
      toast.success('Joined meeting!');
      navigate(`/live/${res.data.data.roomCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-5">Join a Meeting</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Meeting Code *</label>
            <input className="input text-2xl tracking-widest text-center font-mono uppercase"
              placeholder="ABC123XYZ" maxLength={9} value={code}
              onChange={e => setCode(e.target.value.toUpperCase())} />
            <p className="text-xs text-slate-400 mt-1 text-center">9-character code from host</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Password (if required)</label>
            <input className="input" type="password" placeholder="Leave empty if no password"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleJoin} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Joining…' : '🚀 Join Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Live Meetings Hub ─────────────────────────────────────────────────────
export default function LiveMeetingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [myRooms, setMyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    api.get('/live/my/rooms').then(r => setMyRooms(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreated = (room) => {
    setShowCreate(false);
    toast.success(`Room created! Code: ${room.roomCode}`);
    navigate(`/live/${room.roomCode}`);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Room code copied!');
  };

  const statusColor = { waiting: 'badge-gray', live: 'badge-green', ended: 'badge-red' };

  return (
    <div className="space-y-6 animate-fade-in">
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Live Meetings</h1>
          <p className="text-slate-500 text-sm mt-1">Host or join video meetings — like Zoom, built-in</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowJoin(true)} className="btn-secondary">
            <LogIn className="w-4 h-4" /> Join with Code
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Meeting
          </button>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => setShowCreate(true)}
          className="card p-6 text-left hover:border-primary-300 hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
            <Video className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="font-bold text-slate-900 mb-1">New Meeting</h3>
          <p className="text-sm text-slate-500">Start instantly — share the code to invite anyone</p>
        </button>

        <button onClick={() => setShowJoin(true)}
          className="card p-6 text-left hover:border-primary-300 hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
            <LogIn className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Join a Meeting</h3>
          <p className="text-sm text-slate-500">Enter a 9-character code from the host</p>
        </button>

        <button onClick={() => navigate('/meetings/upload')}
          className="card p-6 text-left hover:border-primary-300 hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
            <Monitor className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Upload Recording</h3>
          <p className="text-sm text-slate-500">Upload an existing recording for AI analysis</p>
        </button>
      </div>

      {/* My Rooms */}
      <div className="card">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">My Meeting Rooms</h2>
          <p className="text-sm text-slate-500 mt-0.5">Recent rooms you've hosted</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : myRooms.length === 0 ? (
          <div className="p-8 text-center">
            <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No meetings yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first meeting to get started</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              <Plus className="w-4 h-4" /> Create Meeting
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myRooms.map(room => (
              <div key={room._id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 truncate">{room.title}</p>
                    <span className={`badge ${statusColor[room.status] || 'badge-gray'}`}>{room.status}</span>
                    {room.password && <Shield className="w-3.5 h-3.5 text-slate-400" title="Password protected" />}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold tracking-widest">
                      {room.roomCode}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {room.participants?.length || 0} joined
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => copyCode(room.roomCode)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors" title="Copy code">
                    {copied === room.roomCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {room.status !== 'ended' && (
                    <button onClick={() => navigate(`/live/${room.roomCode}`)}
                      className="btn-primary text-xs px-3 py-1.5">
                      {room.status === 'live' ? '🔴 Rejoin' : 'Open'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
