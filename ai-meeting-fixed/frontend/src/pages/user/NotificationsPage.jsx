// NotificationsPage.jsx
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2, Video, CheckSquare, Users, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  meeting_processed: Video, task_assigned: CheckSquare,
  summary_ready: Bell, team_invite: Users, system: Bell,
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { params: { limit: 50 } }).then(r => r.data),
  });

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    qc.invalidateQueries(['notifications']); qc.invalidateQueries(['notifications-count']);
    toast.success('All marked as read');
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    qc.invalidateQueries(['notifications']); qc.invalidateQueries(['notifications-count']);
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`);
    qc.invalidateQueries(['notifications']);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
        {data?.unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-primary-600" /></div>
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.data?.map(n => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <div key={n._id} onClick={() => !n.isRead && markRead(n._id)}
                className={`card p-4 flex items-start gap-3 cursor-pointer hover:shadow-sm transition-all ${!n.isRead ? 'border-l-4 border-l-primary-500 bg-primary-50/30' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.isRead ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
                <button onClick={(e) => deleteNotif(n._id, e)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
