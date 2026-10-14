import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Video, CheckSquare, Clock, TrendingUp, Upload, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import { useAuthStore } from '../../context/authStore';

const StatusBadge = ({ status }) => {
  const map = {
    completed: 'badge-green', processing: 'badge-blue', failed: 'badge-red',
    scheduled: 'badge-gray', recording: 'badge-yellow',
  };
  return <span className={map[status] || 'badge-gray'}>{status}</span>;
};

const PriorityBadge = ({ priority }) => {
  const map = { urgent: 'badge-red', high: 'badge-yellow', medium: 'badge-blue', low: 'badge-gray' };
  return <span className={map[priority] || 'badge-gray'}>{priority}</span>;
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/users/dashboard-stats').then(r => r.data.data),
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );

  const stats = [
    { label: 'Total Meetings', value: data?.meetings?.total || 0, icon: Video, color: 'bg-blue-100 text-blue-600', change: `+${data?.meetings?.recent || 0} this month` },
    { label: 'Completed', value: data?.meetings?.completed || 0, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600', change: 'processed meetings' },
    { label: 'Pending Tasks', value: data?.tasks?.pending || 0, icon: CheckSquare, color: 'bg-amber-100 text-amber-600', change: `${data?.tasks?.overdue || 0} overdue` },
    { label: 'Total Tasks', value: data?.tasks?.total || 0, icon: Clock, color: 'bg-purple-100 text-purple-600', change: `${data?.tasks?.completed || 0} completed` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.firstName} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your meetings today.</p>
        </div>
        <button onClick={() => navigate('/meetings/upload')} className="btn-primary hidden sm:flex">
          <Upload className="w-4 h-4" />
          Upload Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {data?.tasks?.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            You have <strong>{data.tasks.overdue}</strong> overdue task{data.tasks.overdue > 1 ? 's' : ''}.{' '}
            <button onClick={() => navigate('/tasks?overdue=true')} className="underline font-medium">View tasks</button>
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Meetings */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Recent Meetings</h2>
            <button onClick={() => navigate('/meetings')} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {data?.recentMeetings?.length > 0 ? data.recentMeetings.map(meeting => (
              <button key={meeting._id} onClick={() => navigate(`/meetings/${meeting._id}`)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meeting.status === 'completed' ? 'bg-emerald-100' : meeting.status === 'processing' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <Video className={`w-4 h-4 ${meeting.status === 'completed' ? 'text-emerald-600' : meeting.status === 'processing' ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{meeting.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}</p>
                </div>
                <StatusBadge status={meeting.status} />
              </button>
            )) : (
              <div className="p-8 text-center">
                <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No meetings yet</p>
                <button onClick={() => navigate('/meetings/upload')} className="btn-primary mt-3 text-sm">
                  <Upload className="w-4 h-4" /> Upload your first meeting
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Upcoming Tasks</h2>
            <button onClick={() => navigate('/tasks')} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {data?.upcomingTasks?.length > 0 ? data.upcomingTasks.map(task => (
              <div key={task._id} className="flex items-start gap-3 p-4">
                <input type="checkbox" className="mt-0.5 rounded accent-primary-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <PriorityBadge priority={task.priority} />
                    {task.dueDate && (
                      <span className="text-xs text-slate-400">
                        Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center">
                <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No upcoming tasks</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
