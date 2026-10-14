// AdminMeetingsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, Search, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

export function AdminMeetingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-meetings', page, search, status],
    queryFn: () => api.get('/admin/meetings', { params: { page, limit: 15, status: status || undefined, search: search || undefined } }).then(r => r.data),
    keepPreviousData: true,
  });

  const statusColors = { completed: 'badge-green', processing: 'badge-blue', failed: 'badge-red', scheduled: 'badge-gray' };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold text-white">All Meetings</h1>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm placeholder:text-slate-500 focus:outline-none"
            placeholder="Search meetings..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-sm px-3 focus:outline-none"
          value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-900/50 text-slate-400 text-xs uppercase">
            <th className="px-4 py-3 text-left">Meeting</th>
            <th className="px-4 py-3 text-left hidden md:table-cell">Host</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left hidden lg:table-cell">Created</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-700/50">
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" /></td></tr>
            ) : data?.data?.map(m => (
              <tr key={m._id} className="hover:bg-slate-700/30 cursor-pointer" onClick={() => navigate(`/meetings/${m._id}`)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-200 font-medium">{m.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{m.host?.firstName} {m.host?.lastName}</td>
                <td className="px-4 py-3"><span className={statusColors[m.status] || 'badge-gray'}>{m.status}</span></td>
                <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminMeetingsPage;
