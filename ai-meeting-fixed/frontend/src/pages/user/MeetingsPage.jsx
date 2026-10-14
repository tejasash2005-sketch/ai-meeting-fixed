import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Video, Upload, Search, Filter, Loader2, Clock, MoreVertical, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  completed: 'badge-green', processing: 'badge-blue', failed: 'badge-red',
  scheduled: 'badge-gray', recording: 'badge-yellow',
};

const PLATFORM_ICONS = {
  zoom: '🎥', google_meet: '📹', microsoft_teams: '💬',
  manual_upload: '📁', recorded: '🎙️',
};

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['meetings', page, statusFilter, search],
    queryFn: () => api.get('/meetings', { params: { page, limit: 12, status: statusFilter || undefined, search: search || undefined } }).then(r => r.data),
    keepPreviousData: true,
  });

  const deleteMeeting = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this meeting? This cannot be undone.')) return;
    await api.delete(`/meetings/${id}`);
    refetch();
    toast.success('Meeting deleted');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Meetings</h1>
        <button onClick={() => navigate('/meetings/upload')} className="btn-primary">
          <Upload className="w-4 h-4" /> Upload Meeting
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search meetings..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="scheduled">Scheduled</option>
          <option value="failed">Failed</option>
        </select>
        <button onClick={() => refetch()} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-16">
          <Video className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No meetings found</h3>
          <p className="text-slate-400 mt-1 mb-5">Upload your first recording to get started</p>
          <button onClick={() => navigate('/meetings/upload')} className="btn-primary">
            <Upload className="w-4 h-4" /> Upload Meeting
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data?.map(meeting => (
              <div key={meeting._id}
                className="card p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/meetings/${meeting._id}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{PLATFORM_ICONS[meeting.platform] || '📋'}</span>
                    <span className={STATUS_COLORS[meeting.status] || 'badge-gray'}>{meeting.status}</span>
                  </div>
                  <button
                    onClick={(e) => deleteMeeting(meeting._id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 transition-all"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <h3 className="font-semibold text-slate-900 mt-3 text-sm line-clamp-2">{meeting.title}</h3>
                {meeting.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{meeting.description}</p>}
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}
                  </span>
                  {meeting.aiInsights?.actionItemsCount > 0 && (
                    <span className="badge-blue">{meeting.aiInsights.actionItemsCount} tasks</span>
                  )}
                </div>
                {meeting.status === 'processing' && (
                  <div className="mt-2 w-full bg-blue-100 rounded-full h-1">
                    <div className="bg-blue-500 h-1 rounded-full processing-pulse" style={{ width: `${meeting.processingProgress || 30}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data?.pagination?.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm disabled:opacity-40">Previous</button>
              <span className="flex items-center px-4 text-sm text-slate-600">Page {page} of {data.pagination.pages}</span>
              <button disabled={page === data.pagination.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
