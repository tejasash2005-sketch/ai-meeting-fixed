// TasksPage.jsx
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Plus, Filter, Loader2, AlertCircle, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function TasksPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter, overdueOnly],
    queryFn: () => api.get('/tasks', { params: { status: statusFilter || undefined, priority: priorityFilter || undefined, overdue: overdueOnly || undefined, limit: 50 } }).then(r => r.data),
  });

  const { data: stats } = useQuery({ queryKey: ['task-stats'], queryFn: () => api.get('/tasks/stats').then(r => r.data.data) });

  const toggle = async (task) => {
    const ns = task.status === 'completed' ? 'pending' : 'completed';
    await api.patch(`/tasks/${task._id}/status`, { status: ns });
    qc.invalidateQueries(['tasks']); qc.invalidateQueries(['task-stats']);
    toast.success(ns === 'completed' ? '✓ Task completed!' : 'Task reopened');
  };

  const pColor = { urgent: 'badge-red', high: 'badge-yellow', medium: 'badge-blue', low: 'badge-gray' };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-700' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-600' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
            { label: 'Completion', value: `${stats.completionRate}%`, color: 'text-primary-600' },
          ].map((s, i) => (
            <div key={i} className="card p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
        <select className="input w-36" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button onClick={() => setOverdueOnly(p => !p)}
          className={`btn-secondary text-sm ${overdueOnly ? 'bg-red-50 border-red-200 text-red-600' : ''}`}>
          <AlertCircle className="w-4 h-4" /> Overdue only
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary-600" /></div>
      ) : (
        <div className="space-y-2">
          {data?.data?.map(task => (
            <div key={task._id} className="card p-4 flex items-start gap-3 hover:shadow-sm transition-shadow">
              <button onClick={() => toggle(task)} className="flex-shrink-0 mt-0.5">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-primary-600 border-primary-600' : 'border-slate-300 hover:border-primary-400'}`}>
                  {task.status === 'completed' && <svg className="w-3 h-3" viewBox="0 0 12 10" fill="none"><polyline points="1,5 4,8 11,1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={pColor[task.priority] || 'badge-gray'}>{task.priority}</span>
                  {task.assignedTo?.name && <span className="text-xs text-slate-500">→ {task.assignedTo.name}</span>}
                  {task.dueDate && (
                    <span className={`flex items-center gap-1 text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      <Clock className="w-3 h-3" /> {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  )}
                  {task.meetingId && <span className="text-xs text-slate-400">from: {task.meetingId.title}</span>}
                </div>
              </div>
            </div>
          ))}
          {data?.data?.length === 0 && (
            <div className="text-center py-16">
              <CheckSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">No tasks found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
