import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Video, CheckSquare, FileText, Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['search', query, type],
    queryFn: () => api.get('/search', { params: { q: query, type: type || undefined } }).then(r => r.data.data),
    enabled: query.length >= 2,
  });

  const total = (data?.meetings?.length || 0) + (data?.tasks?.length || 0) + (data?.transcriptions?.length || 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <h1 className="page-title">Search</h1>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          className="input pl-12 pr-10 py-3 text-base"
          placeholder="Search meetings, tasks, transcripts..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Type filter */}
      {query.length >= 2 && (
        <div className="flex gap-2">
          {['', 'meetings', 'tasks', 'transcriptions'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${type === t ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isFetching && query.length >= 2 && (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Searching...
        </div>
      )}

      {/* Results */}
      {data && query.length >= 2 && (
        <div className="space-y-6">
          {total === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No results for "<strong>{query}</strong>"</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">{total} result{total !== 1 ? 's' : ''} for "<strong>{query}</strong>"</p>

              {/* Meetings */}
              {data.meetings?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Video className="w-3.5 h-3.5" /> Meetings ({data.meetings.length})
                  </h3>
                  <div className="space-y-2">
                    {data.meetings.map(m => (
                      <button key={m._id} onClick={() => navigate(`/meetings/${m._id}`)}
                        className="card p-4 w-full text-left hover:shadow-md transition-shadow flex items-center gap-3">
                        <Video className="w-5 h-5 text-primary-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-800">{m.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 capitalize">{m.status} · {m.platform?.replace(/_/g, ' ')}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {data.tasks?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5" /> Tasks ({data.tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {data.tasks.map(t => (
                      <button key={t._id} onClick={() => navigate('/tasks')}
                        className="card p-4 w-full text-left hover:shadow-md transition-shadow flex items-center gap-3">
                        <CheckSquare className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-800">{t.title}</p>
                          {t.meetingId && <p className="text-xs text-slate-400 mt-0.5">from: {t.meetingId.title}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcripts */}
              {data.transcriptions?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Transcripts ({data.transcriptions.length})
                  </h3>
                  <div className="space-y-2">
                    {data.transcriptions.map(t => (
                      <button key={t._id} onClick={() => navigate(`/meetings/${t.meetingId?._id}`)}
                        className="card p-4 w-full text-left hover:shadow-md transition-shadow">
                        <p className="font-medium text-slate-800 text-sm">{t.meetingId?.title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">...{t.excerpt}...</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Prompt */}
      {query.length < 2 && (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Type at least 2 characters to search</p>
        </div>
      )}
    </div>
  );
}
