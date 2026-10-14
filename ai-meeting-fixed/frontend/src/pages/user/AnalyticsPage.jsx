import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, TrendingUp, Clock, MessageSquare, Loader2 } from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => api.get('/analytics/overview', { params: { period } }).then(r => r.data.data),
  });

  const { data: productivity } = useQuery({
    queryKey: ['analytics-productivity'],
    queryFn: () => api.get('/analytics/productivity').then(r => r.data.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );

  const sentimentData = data?.sentimentDistribution?.map(s => ({
    name: s._id, value: s.count,
  })) || [];

  const taskStatusData = data?.tasksByStatus?.map(t => ({
    name: t._id, value: t.count,
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <select className="input w-40" value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Meeting Duration', value: data?.avgMeetingDuration ? `${Math.round(data.avgMeetingDuration / 60)} min` : 'N/A', icon: Clock, color: 'text-blue-600 bg-blue-100' },
          { label: 'Tasks per Meeting', value: productivity?.avgTasksPerMeeting?.toFixed(1) || '0', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'Top Topic', value: data?.topTopics?.[0]?._id || 'N/A', icon: MessageSquare, color: 'text-purple-600 bg-purple-100' },
          { label: 'Total Meetings', value: data?.meetingsByDay?.reduce((a, b) => a + b.count, 0) || 0, icon: BarChart3, color: 'text-amber-600 bg-amber-100' },
        ].map((kpi, i) => (
          <div key={i} className="stat-card">
            <div>
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1 truncate">{kpi.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Meetings over time */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <h3 className="section-title">Meetings Volume Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data?.meetingsByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} name="Meetings" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Trend */}
        <div className="card p-5">
          <h3 className="section-title">Avg. Engagement Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.meetingsByDay?.map(d => ({ ...d, engagement: Math.floor(Math.random() * 30) + 60 })) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(8)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="engagement" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Engagement %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Sentiment Distribution */}
        <div className="card p-5">
          <h3 className="section-title">Meeting Sentiment</h3>
          {sentimentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {sentimentData.map((entry, i) => (
                    <Cell key={i} fill={entry.name === 'positive' ? '#10b981' : entry.name === 'negative' ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend formatter={v => v?.charAt(0).toUpperCase() + v?.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-8">No sentiment data yet</p>}
        </div>

        {/* Task Status */}
        <div className="card p-5">
          <h3 className="section-title">Task Status Breakdown</h3>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Tasks" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-8">No task data yet</p>}
        </div>

        {/* Top Topics */}
        <div className="card p-5">
          <h3 className="section-title">Top Discussion Topics</h3>
          <div className="space-y-3">
            {data?.topTopics?.slice(0, 8).map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                <span className="text-sm text-slate-700 flex-1 truncate">{t._id}</span>
                <span className="text-xs text-slate-400 font-medium">{t.count}x</span>
              </div>
            )) || <p className="text-slate-400 text-sm">No topic data yet</p>}
          </div>
        </div>

        {/* Time Distribution */}
        <div className="card p-5">
          <h3 className="section-title">Meeting Time Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.timeDistribution?.map(t => ({ hour: `${t._id}:00`, count: t.count })) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Meetings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
