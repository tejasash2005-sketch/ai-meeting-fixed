import React, { useState } from 'react';
import { useAuthStore } from '../../context/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { User, Lock, Bell, Link, Save, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '', lastName: user?.lastName || '',
    jobTitle: user?.jobTitle || '', department: user?.department || '',
    phone: user?.phone || '', timezone: user?.timezone || 'UTC',
  });

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [prefs, setPrefs] = useState({
    emailNotifications: user?.preferences?.emailNotifications ?? true,
    autoExtractTasks: user?.preferences?.autoExtractTasks ?? true,
    defaultSummaryLength: user?.preferences?.defaultSummaryLength || 'detailed',
    theme: user?.preferences?.theme || 'system',
    language: user?.preferences?.language || 'en',
  });

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/users/profile', profile);
      updateUser(res.data.data);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await api.put('/auth/change-password', passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed!');
    } catch { toast.error('Incorrect current password'); }
    finally { setSaving(false); }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await api.put('/users/preferences', prefs);
      updateUser({ preferences: { ...user?.preferences, ...prefs } });
      toast.success('Preferences saved!');
    } catch { toast.error('Failed to save preferences'); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Preferences', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Link },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <h1 className="page-title">Settings</h1>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <form onSubmit={saveProfile} className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Profile Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First name</label>
              <input className="input" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
              <input className="input" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job title</label>
            <input className="input" placeholder="Software Engineer" value={profile.jobTitle} onChange={e => setProfile(p => ({ ...p, jobTitle: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <input className="input" placeholder="Engineering" value={profile.department} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input className="input" placeholder="+1 (555) 000-0000" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
            <select className="input" value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}>
              {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Profile</>}
          </button>
        </form>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <form onSubmit={changePassword} className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Change Password</h3>
          {['currentPassword', 'newPassword', 'confirmPassword'].map((field, i) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {['Current password', 'New password', 'Confirm new password'][i]}
              </label>
              <input type="password" className="input" required value={passwords[field]}
                onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Lock className="w-4 h-4" /> Change Password</>}
          </button>
        </form>
      )}

      {/* Preferences tab */}
      {activeTab === 'notifications' && (
        <div className="card p-6 space-y-5">
          <h3 className="font-semibold text-slate-800">Preferences</h3>
          {[
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email when meetings are processed' },
            { key: 'autoExtractTasks', label: 'Auto-Extract Tasks', desc: 'Automatically extract action items from transcripts' },
          ].map(pref => (
            <div key={pref.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-800">{pref.label}</p>
                <p className="text-xs text-slate-500">{pref.desc}</p>
              </div>
              <button onClick={() => setPrefs(p => ({ ...p, [pref.key]: !p[pref.key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${prefs[pref.key] ? 'bg-primary-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[pref.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Summary Length</label>
            <select className="input" value={prefs.defaultSummaryLength} onChange={e => setPrefs(p => ({ ...p, defaultSummaryLength: e.target.value }))}>
              <option value="brief">Brief</option>
              <option value="detailed">Detailed</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Theme</label>
            <select className="input" value={prefs.theme} onChange={e => setPrefs(p => ({ ...p, theme: e.target.value }))}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <button onClick={savePrefs} disabled={saving} className="btn-primary">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Preferences</>}
          </button>
        </div>
      )}

      {/* Integrations tab */}
      {activeTab === 'integrations' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Integrations</h3>
          {[
            { name: 'Google Calendar', icon: '📅', desc: 'Sync meetings and tasks with Google Calendar', connected: user?.integrations?.google?.connected },
            { name: 'Zoom', icon: '🎥', desc: 'Auto-import Zoom cloud recordings', connected: user?.integrations?.zoom?.connected },
            { name: 'Microsoft Teams', icon: '💼', desc: 'Import Teams meeting recordings', connected: user?.integrations?.microsoft?.connected },
          ].map(int => (
            <div key={int.name} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <span className="text-2xl">{int.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-slate-800 text-sm">{int.name}</p>
                <p className="text-xs text-slate-500">{int.desc}</p>
              </div>
              <button className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${int.connected ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                {int.connected ? '✓ Connected' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
