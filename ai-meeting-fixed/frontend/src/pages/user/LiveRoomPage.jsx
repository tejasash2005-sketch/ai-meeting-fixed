import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  Users, Copy, Check, Monitor, StopCircle, Hand, MoreVertical, Shield
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', { autoConnect: false });

export default function LiveRoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [chat, setChat] = useState([]);
  const [aiStats, setAiStats] = useState({ sentiment: 'neutral', engagement: 0, monologueAlert: false });
  const [chatInput, setChatInput] = useState('');
  const [participants, setParticipants] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const chatEndRef = useRef(null);
  const timerRef = useRef(null);

  const isHost = room?.host?._id === user?.id || room?.host === user?.id;

  useEffect(() => {
    loadRoom();
    startCamera();
    setupSocket();
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1);
      // Simulate live AI analysis every 10 seconds
      if (elapsed > 0 && elapsed % 10 === 0) {
        setAiStats(prev => ({
          sentiment: Math.random() > 0.7 ? 'positive' : 'neutral',
          engagement: Math.min(100, prev.engagement + Math.floor(Math.random() * 10)),
          monologueAlert: Math.random() > 0.8
        }));
      }
    }, 1000);
    return () => {
      stopCamera();
      socket.disconnect();
      clearInterval(timerRef.current);
    };
  }, [roomCode]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const loadRoom = async () => {
    try {
      const res = await api.get(`/live/${roomCode}`);
      setRoom(res.data.data);
      setParticipants(res.data.data.participants || []);
      setChat(res.data.data.chat || []);
    } catch { toast.error('Room not found'); navigate('/live'); }
    setLoading(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast('Camera/mic not available — joining without media', { icon: '⚠️' });
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const setupSocket = () => {
    socket.connect();
    socket.emit('join-room', { roomCode, userId: user?.id, userName: `${user?.firstName} ${user?.lastName}` });
    socket.on('user-joined', ({ userName }) => {
      toast(`${userName} joined`, { icon: '👋' });
      setParticipants(p => [...p, { name: userName, joinedAt: new Date() }]);
    });
    socket.on('user-left', ({ userName }) => {
      toast(`${userName} left`, { icon: '👋' });
    });
    socket.on('room-chat', ({ message, userName, timestamp }) => {
      setChat(c => [...c, { name: userName, message, timestamp }]);
    });
    socket.on('meeting-ended', () => {
      toast.error('Host ended the meeting');
      navigate('/live');
    });
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = muted; setMuted(!muted); }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) { track.enabled = videoOff; setVideoOff(!videoOff); }
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChat(c => [...c, { name: 'You', message: msg, timestamp: new Date(), self: true }]);
    socket.emit('room-chat', { roomCode, message: msg, userName: `${user?.firstName} ${user?.lastName}` });
    try { await api.post(`/live/${roomCode}/chat`, { message: msg }); } catch {}
  };

  const endMeeting = async () => {
    if (!confirm('End meeting for everyone?')) return;
    try {
      await api.patch(`/live/${roomCode}/end`);
      socket.emit('host-ended', { roomCode });
    } catch {}
    stopCamera();
    navigate('/live');
    toast.success('Meeting ended. Upload a recording to get AI analysis!');
  };

  const leaveMeeting = () => {
    socket.emit('leave-room', { roomCode, userId: user?.id, userName: `${user?.firstName} ${user?.lastName}` });
    stopCamera();
    navigate('/live');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Room code copied!');
  };

  const fmtTime = s => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="text-white text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>Joining meeting…</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col overflow-hidden z-40">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-semibold text-sm truncate max-w-xs">{room?.title}</span>
          <span className="font-mono text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">{fmtTime(elapsed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyCode} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="font-mono font-semibold tracking-wider">{roomCode}</span>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 bg-slate-900 relative">
          {/* Self video */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {!videoOff ? (
              <video ref={videoRef} autoPlay muted playsInline
                className="w-full max-w-2xl rounded-2xl object-cover bg-slate-800 shadow-2xl"
                style={{ maxHeight: '70vh' }} />
            ) : (
              <div className="w-full max-w-2xl rounded-2xl bg-slate-800 shadow-2xl flex items-center justify-center"
                style={{ aspectRatio: '16/9' }}>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-2xl font-bold">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                  </div>
                  <p className="text-white text-sm">{user?.firstName} {user?.lastName}</p>
                  <p className="text-slate-400 text-xs mt-1">Camera off</p>
                </div>
              </div>
            )}
          </div>

          {/* Self label */}
          <div className="absolute bottom-20 left-6 flex items-center gap-2 bg-black/60 rounded-lg px-2.5 py-1">
            <span className="text-white text-xs font-medium">You {isHost && <span className="text-amber-400">(Host)</span>}</span>
            {muted && <MicOff className="w-3 h-3 text-red-400" />}
          </div>

          {/* Participants chips */}
          {participants.filter(p => p.userId?.toString() !== user?.id).slice(0, 6).map((p, i) => (
            <div key={i} className="absolute bg-slate-800 rounded-xl p-2 shadow-lg"
              style={{ bottom: `${80 + Math.floor(i/3)*100}px`, right: `${20 + (i%3)*120}px` }}>
              <div className="w-14 h-10 rounded-lg bg-slate-700 flex items-center justify-center mb-1">
                <span className="text-white text-sm font-bold">{p.name?.[0] || '?'}</span>
              </div>
              <p className="text-white text-xs text-center truncate max-w-14">{p.name?.split(' ')[0]}</p>
            </div>
          ))}
        </div>

        {/* Chat/Participants sidebar */}
        {(showChat || showParticipants) && (
          <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0">
            {/* Sidebar tabs */}
            <div className="flex border-b border-slate-700">
              <button onClick={() => { setShowChat(true); setShowParticipants(false); setShowAI(false); }}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${showChat ? 'text-white border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}>
                <MessageSquare className="w-4 h-4 mx-auto mb-0.5" /> Chat
              </button>
              <button onClick={() => { setShowParticipants(true); setShowChat(false); setShowAI(false); }}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${showParticipants ? 'text-white border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'}`}>
                <Users className="w-4 h-4 mx-auto mb-0.5" /> People ({participants.length})
              </button>
              <button onClick={() => { setShowAI(true); setShowChat(false); setShowParticipants(false); }}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${showAI ? 'text-white border-b-2 border-purple-500' : 'text-slate-400 hover:text-white'}`}>
                <Sparkles className="w-4 h-4 mx-auto mb-0.5 text-purple-400" /> Live AI
              </button>
            </div>

            {showChat && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {chat.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-4">No messages yet. Say hello! 👋</p>
                  )}
                  {chat.map((msg, i) => (
                    <div key={i} className={`${msg.self ? 'items-end' : 'items-start'} flex flex-col`}>
                      <p className="text-xs text-slate-400 mb-0.5">{msg.name}</p>
                      <div className={`rounded-xl px-3 py-2 max-w-full text-sm ${msg.self ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-slate-700 flex gap-2">
                  <input className="flex-1 bg-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-slate-500"
                    placeholder="Message everyone…" value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()} />
                  <button onClick={sendChat} className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                    Send
                  </button>
                </div>
              </>
            )}

            {showParticipants && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-600/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-400 text-xs font-bold">{p.name?.[0] || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.name}</p>
                      {p.isHost && <span className="text-xs text-amber-400">Host</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAI && (
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-slate-300 text-xs font-bold uppercase tracking-wider">Live Sentiment</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${aiStats.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {aiStats.sentiment}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${aiStats.sentiment === 'positive' ? 'bg-emerald-500 w-full' : 'bg-primary-500 w-1/2'}`} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-slate-300 text-xs font-bold uppercase tracking-wider">Engagement Score</h4>
                    <span className="text-purple-400 text-xs font-bold font-mono">{aiStats.engagement}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${aiStats.engagement}%` }} />
                  </div>
                </div>

                {aiStats.monologueAlert && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3 animate-pulse">
                    <Brain className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-amber-500 text-xs font-bold">Monologue Alert</p>
                      <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">Host has been speaking for over 5 minutes. Consider asking for feedback to improve engagement.</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-700">
                  <h4 className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">Live Insights</h4>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-slate-700/50 text-[10px] text-slate-400 italic">
                      "AI is listening to transcribe and extract action items in real-time..."
                    </div>
                    {elapsed > 30 && (
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-slate-300">
                        ✨ <span className="text-purple-400 font-bold">Key Topic:</span> Authentication module progress.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-slate-800 border-t border-slate-700 py-4 flex items-center justify-center gap-3 flex-shrink-0">
        {/* Mic */}
        <button onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
        </button>

        {/* Camera */}
        <button onClick={toggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${videoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          title={videoOff ? 'Start video' : 'Stop video'}>
          {videoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
        </button>

        {/* Chat toggle */}
        <button onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${showChat ? 'bg-primary-600 hover:bg-primary-700' : 'bg-slate-700 hover:bg-slate-600'}`}>
          <MessageSquare className="w-5 h-5 text-white" />
        </button>

        {/* Participants toggle */}
        <button onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${showParticipants ? 'bg-primary-600 hover:bg-primary-700' : 'bg-slate-700 hover:bg-slate-600'}`}>
          <Users className="w-5 h-5 text-white" />
        </button>

        {/* Raise hand */}
        <button onClick={() => { setHandRaised(!handRaised); toast(handRaised ? 'Hand lowered' : 'Hand raised ✋'); }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${handRaised ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
          <Hand className="w-5 h-5 text-white" />
        </button>

        <div className="w-px h-8 bg-slate-700 mx-2" />

        {/* Leave / End */}
        {isHost ? (
          <button onClick={endMeeting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full font-medium text-sm transition-colors">
            <StopCircle className="w-4 h-4" /> End for All
          </button>
        ) : (
          <button onClick={leaveMeeting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full font-medium text-sm transition-colors">
            <PhoneOff className="w-4 h-4" /> Leave
          </button>
        )}
      </div>
    </div>
  );
}
