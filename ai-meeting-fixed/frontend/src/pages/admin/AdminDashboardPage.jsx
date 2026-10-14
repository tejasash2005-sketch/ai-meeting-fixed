import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Video, CheckSquare, TrendingUp, Activity, Loader2, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data.data),
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
    </div>
  );

  const stats = [
    { label: 'Total Users', value: data?.overview?.users?.total || 0, sub: `+${data?.overview?.users?.new || 0} this month`, icon: Users, color: 'text-blue-400 bg-blue-500/10' },
    { label: 'Active Users', value: data?.overview?.users?.active || 0, sub: 'last 7 days', icon: Activity, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Total Meetings', value: data?.overview?.meetings?.total || 0, sub: `${data?.overview?.meetings?.processing || 0} processing`, icon: Video, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Task Completion', value: `${data?.overview?.tasks?.completionRate || 0}%`, sub: `${data?.overview?.tasks?.completed || 0} done`, icon: CheckSquare, color: 'text-purple-400 bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Platform overview and key metrics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* User growth */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-slate-200 mb-4">User Growth (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.charts?.userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
              <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Meeting growth */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Meeting Activity (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.charts?.meetingGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Meetings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Meeting status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Meeting Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data?.charts?.meetingsByStatus || []} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="_id" paddingAngle={3}>
                {(data?.charts?.meetingsByStatus || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
              <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top users */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Top Users by Meetings</h3>
          <div className="space-y-3">
            {data?.topUsers?.map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-amber-400 font-bold text-sm w-5">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-medium">
                  {u.user?.firstName?.[0]}{u.user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{u.user?.firstName} {u.user?.lastName}</p>
                  <p className="text-xs text-slate-500 truncate">{u.user?.email}</p>
                </div>
                <span className="badge-blue text-xs">{u.meetingsCount} meetings</span>
              </div>
            ))}
            {!data?.topUsers?.length && <p className="text-slate-500 text-sm text-center py-4">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
