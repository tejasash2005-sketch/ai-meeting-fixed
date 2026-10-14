import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Server, Database, Cpu, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function AdminSystemPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/admin/system-health').then(r => r.data.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>;

  const memMB = data?.memory ? (data.memory.heapUsed / 1024 / 1024).toFixed(1) : 0;
  const uptime = data?.uptime ? `${Math.floor(data.uptime / 3600)}h ${Math.floor((data.uptime % 3600) / 60)}m` : 'N/A';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">System Health</h1>
        <button onClick={() => refetch()} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
          Refresh
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Database', value: data?.database?.status, icon: Database, ok: data?.database?.status === 'connected' },
          { label: 'API Server', value: 'Running', icon: Server, ok: true },
          { label: 'Uptime', value: uptime, icon: Clock, ok: true },
          { label: 'Memory', value: `${memMB} MB`, icon: Cpu, ok: parseFloat(memMB) < 500 },
        ].map((item, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <item.icon className="w-5 h-5 text-slate-400" />
              {item.ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
            </div>
            <p className="text-lg font-bold text-white capitalize">{item.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Meetings health */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="font-semibold text-slate-200 mb-4">Meeting Processing</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: data?.meetings?.total, color: 'text-slate-200' },
            { label: 'Processing', value: data?.meetings?.processing, color: 'text-blue-400' },
            { label: 'Failed', value: data?.meetings?.failed, color: data?.meetings?.failed > 0 ? 'text-red-400' : 'text-slate-400' },
          ].map((m, i) => (
            <div key={i} className="text-center p-4 bg-slate-900/50 rounded-xl">
              <p className={`text-3xl font-bold ${m.color}`}>{m.value ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System info */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="font-semibold text-slate-200 mb-4">System Info</h3>
        <div className="space-y-2 text-sm">
          {[
            ['Node.js Version', data?.nodeVersion],
            ['Environment', process.env.NODE_ENV || 'production'],
            ['Timestamp', data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'],
            ['Heap Total', data?.memory ? `${(data.memory.heapTotal / 1024 / 1024).toFixed(1)} MB` : 'N/A'],
            ['External Memory', data?.memory ? `${(data.memory.external / 1024 / 1024).toFixed(1)} MB` : 'N/A'],
          ].map(([k, v], i) => (
            <div key={i} className="flex justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">{k}</span>
              <span className="text-slate-200 font-mono text-xs">{v || 'N/A'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
