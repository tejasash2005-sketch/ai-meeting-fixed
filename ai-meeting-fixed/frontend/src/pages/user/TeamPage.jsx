import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Copy, UserMinus, Crown, Loader2, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../context/authStore';
import { formatDistanceToNow } from 'date-fns';

export default function TeamPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [activeTeamId, setActiveTeamId] = useState(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => api.get('/teams/my').then(r => r.data.data),
  });

  const activeTeam = teams?.find(t => t._id === activeTeamId) || teams?.[0];

  useEffect(() => {
    if (teams?.length > 0 && !activeTeamId) {
      setActiveTeamId(teams[0]._id);
    }
  }, [teams]);

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teams', { name: teamName });
      qc.invalidateQueries(['my-teams']);
      setCreating(false); setTeamName('');
      setActiveTeamId(res.data.data._id);
      toast.success('Team created!');
    } catch { toast.error('Failed to create team'); }
  };

  const joinTeam = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teams/join', { inviteCode });
      qc.invalidateQueries(['my-teams']);
      setJoining(false); setInviteCode('');
      setActiveTeamId(res.data.data._id);
      toast.success('Joined team!');
    } catch { toast.error('Invalid invite code'); }
  };

  const copyInviteCode = () => {
    navigator.clipboard?.writeText(activeTeam?.inviteCode || '');
    toast.success('Invite code copied!');
  };

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    await api.delete(`/teams/${activeTeam._id}/members/${memberId}`);
    qc.invalidateQueries(['my-teams']);
    toast.success('Member removed');
  };

  const roleIcon = { owner: Crown, admin: Shield };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Teams & Collaboration</h1>
        <div className="flex gap-2">
          <button onClick={() => { setCreating(true); setJoining(false); }} className="btn-secondary text-sm px-3 py-1.5"><Plus className="w-4 h-4" /> Create</button>
          <button onClick={() => { setJoining(true); setCreating(false); }} className="btn-secondary text-sm px-3 py-1.5">Join</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Teams</p>
          {teams?.map(t => (
            <button
              key={t._id}
              onClick={() => setActiveTeamId(t._id)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${activeTeamId === t._id ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${activeTeamId === t._id ? 'bg-white/20' : 'bg-primary-100 text-primary-700'}`}>
                {t.name?.[0]?.toUpperCase()}
              </div>
              <span className="truncate font-medium">{t.name}</span>
            </button>
          ))}
          {!teams?.length && <p className="text-sm text-slate-400 italic">No teams joined yet.</p>}
        </div>

        {/* Team Detail */}
        <div className="lg:col-span-3 space-y-6">
          {/* Create form */}
          {creating && (
            <div className="card p-5 border-2 border-primary-100">
              <h3 className="font-semibold text-slate-800 mb-4">Create a New Team</h3>
              <form onSubmit={createTeam} className="flex gap-3">
                <input className="input flex-1" placeholder="Team name (e.g. Engineering Alpha)" required value={teamName} onChange={e => setTeamName(e.target.value)} />
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" onClick={() => setCreating(false)} className="btn-secondary">Cancel</button>
              </form>
            </div>
          )}

          {/* Join form */}
          {joining && (
            <div className="card p-5 border-2 border-primary-100">
              <h3 className="font-semibold text-slate-800 mb-4">Join a Team</h3>
              <form onSubmit={joinTeam} className="flex gap-3">
                <input className="input flex-1" placeholder="Enter invite code" required value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
                <button type="submit" className="btn-primary">Join</button>
                <button type="button" onClick={() => setJoining(false)} className="btn-secondary">Cancel</button>
              </form>
            </div>
          )}

          {activeTeam ? (
            <>
              {/* Team card */}
              <div className="card p-6 bg-gradient-to-br from-white to-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      {activeTeam.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{activeTeam.name}</h2>
                      <p className="text-sm text-slate-500 mt-1">{activeTeam.description || 'Collaborative workspace for your team meetings.'}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{activeTeam.members?.length} members</span>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full capitalize">{activeTeam.plan} Plan</span>
                      </div>
                    </div>
                  </div>
                  {activeTeam.members?.find(m => m.user?._id === user?._id && ['owner', 'admin'].includes(m.role)) && (
                    <button onClick={copyInviteCode} className="btn-secondary text-sm flex items-center gap-2">
                      <Copy className="w-4 h-4" /> Copy Invite Code
                    </button>
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="card overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-white">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-600" /> Team Members
                  </h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {activeTeam.members?.map(member => {
                    const RoleIcon = roleIcon[member.role];
                    const isSelf = member.user?._id === user?._id;
                    return (
                      <div key={member._id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm border-2 border-white shadow-sm">
                          {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {member.user?.firstName} {member.user?.lastName} {isSelf && <span className="text-xs text-primary-500 font-normal ml-1">(You)</span>}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{member.user?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {RoleIcon && <RoleIcon className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${member.role === 'owner' ? 'bg-amber-100 text-amber-700' : member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {member.role}
                          </span>
                        </div>
                        {activeTeam.owner?.toString() === user?._id?.toString() && !isSelf && (
                          <button onClick={() => removeMember(member.user?._id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : !creating && !joining && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Select or Create a Team</h3>
              <p className="text-slate-400 mt-2 mb-6 max-w-sm mx-auto">Collaborate with your colleagues, share meeting summaries, and track team-wide action items.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setCreating(true)} className="btn-primary px-6">Create New Team</button>
                <button onClick={() => setJoining(true)} className="btn-secondary px-6">Join Existing</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
