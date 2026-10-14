import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Video, FileText, CheckSquare, BarChart3, Download, Share2, RefreshCw, Loader2, Clock, Users, Mic } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'transcript', label: 'Transcript', icon: Mic },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

const ProcessingBanner = ({ meeting }) => {
  const stages = { uploading: 10, transcribing: 40, summarizing: 70, extracting_tasks: 85, done: 100 };
  const progress = stages[meeting.processingStage] || meeting.processingProgress || 0;
  const labels = { uploading: 'Uploading file...', transcribing: 'Transcribing audio with Whisper AI...', summarizing: 'Generating summary with GPT-4...', extracting_tasks: 'Extracting tasks & deadlines...' };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <p className="font-medium text-blue-800">{labels[meeting.processingStage] || 'Processing...'}</p>
        <span className="ml-auto text-sm text-blue-600 font-medium">{progress}%</span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full transition-all duration-500 processing-pulse" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

const SummaryTab = ({ summary }) => {
  if (!summary) return <div className="text-center py-12 text-slate-400">No summary available yet.</div>;
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-2">Overview</h3>
        <p className="text-slate-600 leading-relaxed">{summary.detailed || summary.brief}</p>
      </div>
      {summary.keyDecisions?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Key Decisions</h3>
          <div className="space-y-2">
            {summary.keyDecisions.map((d, i) => (
              <div key={i} className="flex gap-3 p-3 bg-amber-50 rounded-lg">
                <span className="w-5 h-5 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{d.decision}</p>
                  {d.madeBy && <p className="text-xs text-slate-500 mt-0.5">by {d.madeBy}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {summary.nextSteps?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Next Steps</h3>
          <ul className="space-y-2">
            {summary.nextSteps.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-primary-500 mt-0.5">→</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.openQuestions?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Open Questions</h3>
          <ul className="space-y-2">
            {summary.openQuestions.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-slate-400">?</span> {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const TranscriptTab = ({ transcription }) => {
  if (!transcription?.segments?.length) {
    return (
      <div className="card p-5">
        <pre className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-mono">
          {transcription?.rawText || 'No transcription available yet.'}
        </pre>
      </div>
    );
  }
  const speakerColors = ['text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600', 'text-rose-600'];
  const speakerMap = {};
  return (
    <div className="card p-5 space-y-3">
      {transcription.segments.map((seg, i) => {
        if (!speakerMap[seg.speaker]) speakerMap[seg.speaker] = Object.keys(speakerMap).length;
        const color = speakerColors[speakerMap[seg.speaker] % speakerColors.length];
        const time = `${String(Math.floor(seg.start / 60)).padStart(2, '0')}:${String(Math.floor(seg.start % 60)).padStart(2, '0')}`;
        return (
          <div key={i} className="transcript-segment flex gap-3 p-2 rounded-lg">
            <span className="text-xs text-slate-400 font-mono w-10 flex-shrink-0 mt-0.5">{time}</span>
            <div>
              <span className={`text-xs font-semibold ${color} mr-2`}>{seg.speaker}</span>
              <span className="text-sm text-slate-700">{seg.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TasksTab = ({ tasks, meetingId }) => {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(null);
  const priorityMap = { urgent: 'badge-red', high: 'badge-yellow', medium: 'badge-blue', low: 'badge-gray' };
  const statusMap = { completed: 'badge-green', pending: 'badge-gray', in_progress: 'badge-blue', overdue: 'badge-red' };

  const toggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
    queryClient.invalidateQueries(['meeting', meetingId]);
    toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened');
  };

  const syncToExternal = async (task, service) => {
    setSyncing(`${task._id}-${service}`);
    try {
      // Mocking API call to external service
      await new Promise(r => setTimeout(r, 1000));
      toast.success(`Task synced to ${service}!`);
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  if (!tasks?.length) return <div className="text-center py-12 text-slate-400">No tasks extracted from this meeting.</div>;

  return (
    <div className="space-y-3">
      {tasks.map(task => (
        <div key={task._id} className="card p-4 flex items-start gap-3 group">
          <button onClick={() => toggleTask(task)} className="mt-0.5 flex-shrink-0">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-primary-600 border-primary-600' : 'border-slate-300 hover:border-primary-400'}`}>
              {task.status === 'completed' && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor"><path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => syncToExternal(task, 'Slack')}
                  disabled={syncing === `${task._id}-Slack`}
                  className="p-1 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"
                >
                  {syncing === `${task._id}-Slack` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Slack'}
                </button>
                <button
                  onClick={() => syncToExternal(task, 'Jira')}
                  disabled={syncing === `${task._id}-Jira`}
                  className="p-1 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"
                >
                  {syncing === `${task._id}-Jira` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Jira'}
                </button>
              </div>
            </div>
            {task.assignedTo?.name && <p className="text-xs text-slate-500 mt-0.5">Assigned to: {task.assignedTo.name}</p>}
            {task.transcriptReference?.text && (
              <p className="text-xs text-slate-400 mt-1 italic">"{task.transcriptReference.text}"</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={priorityMap[task.priority] || 'badge-gray'}>{task.priority}</span>
              <span className={statusMap[task.status] || 'badge-gray'}>{task.status}</span>
              {task.dueDate && (
                <span className="text-xs text-slate-400">Due {format(new Date(task.dueDate), 'MMM d')}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('summary');

  const { data, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => api.get(`/meetings/${id}`).then(r => r.data.data),
    refetchInterval: (data) => data?.status === 'processing' ? 5000 : false,
  });

  const meeting = data;

  const handleExport = async () => {
    try {
      const res = await api.get(`/summaries/${id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `summary-${id}.txt`; a.click();
    } catch { toast.error('Export failed'); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  if (!meeting) return <div className="text-center py-12 text-slate-500">Meeting not found</div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate('/meetings')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to meetings
      </button>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Video className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{meeting.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {meeting.scheduledAt ? format(new Date(meeting.scheduledAt), 'MMM d, yyyy') : formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}</span>
                {meeting.duration > 0 && <span>{Math.round(meeting.duration / 60)} min</span>}
                <span className="capitalize">{meeting.platform?.replace(/_/g, ' ')}</span>
                {meeting.category && <span className="capitalize">{meeting.category}</span>}
              </div>
              {meeting.tags?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {meeting.tags.map(t => <span key={t} className="badge-gray text-xs">{t}</span>)}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {meeting.status === 'completed' && (
              <>
                <button onClick={handleExport} className="btn-secondary text-sm py-1.5">
                  <Download className="w-4 h-4" /> Export
                </button>
                <button onClick={async () => {
                  const res = await api.post(`/meetings/${id}/share`);
                  navigator.clipboard?.writeText(res.data.data.shareUrl);
                  toast.success('Share link copied!');
                }} className="btn-secondary text-sm py-1.5">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </>
            )}
          </div>
        </div>

        {/* Video Player & Chapters */}
        {meeting.status === 'completed' && meeting.recording?.fileUrl && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-lg border border-slate-200">
                <video
                  id="meeting-video"
                  src={meeting.recording.fileUrl.startsWith('http')
                    ? meeting.recording.fileUrl
                    : `${window.location.origin}${meeting.recording.fileUrl.startsWith('/uploads') ? '' : '/uploads'}${meeting.recording.fileUrl}`
                  }
                  controls
                  className="w-full h-full"
                  poster={meeting.recording.thumbnailUrl || undefined}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* Chapters Column */}
            <div className="card p-4 overflow-hidden flex flex-col h-full max-h-[400px] lg:max-h-full">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-primary-600" /> Video Chapters
              </h3>
              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {meeting.summary?.chapters?.length > 0 ? (
                  meeting.summary.chapters.map((chapter, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const video = document.getElementById('meeting-video');
                        if (video) video.currentTime = chapter.startTime;
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors group flex items-start gap-3 border border-transparent hover:border-slate-100"
                    >
                      <span className="text-xs font-mono text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded mt-0.5">
                        {Math.floor(chapter.startTime / 60)}:{(chapter.startTime % 60).toString().padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700">{chapter.title}</p>
                        {chapter.summary && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{chapter.summary}</p>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-400">AI hasn't generated chapters for this recording yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Insights bar */}
        {meeting.status === 'completed' && meeting.aiInsights && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 bg-slate-50 rounded-lg">
              <p className="text-lg font-bold text-slate-900">{meeting.aiInsights.actionItemsCount || 0}</p>
              <p className="text-xs text-slate-500">Action Items</p>
            </div>
            <div className="text-center p-2 bg-slate-50 rounded-lg">
              <p className="text-lg font-bold text-slate-900">{meeting.aiInsights.decisionsCount || 0}</p>
              <p className="text-xs text-slate-500">Decisions</p>
            </div>
            <div className="text-center p-2 bg-slate-50 rounded-lg">
              <p className={`text-lg font-bold capitalize ${meeting.aiInsights.sentiment === 'positive' ? 'text-emerald-600' : meeting.aiInsights.sentiment === 'negative' ? 'text-red-600' : 'text-amber-600'}`}>
                {meeting.aiInsights.sentiment || 'N/A'}
              </p>
              <p className="text-xs text-slate-500">Sentiment</p>
            </div>
            <div className="text-center p-2 bg-slate-50 rounded-lg">
              <p className="text-lg font-bold text-slate-900">{meeting.aiInsights.engagementScore || 0}%</p>
              <p className="text-xs text-slate-500">Engagement</p>
            </div>
          </div>
        )}
      </div>

      {/* Processing */}
      {meeting.status === 'processing' && <ProcessingBanner meeting={meeting} />}
      {meeting.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <p className="text-red-700 text-sm flex-1">Processing failed: {meeting.errorMessage || 'Unknown error'}</p>
          <button onClick={() => api.post(`/meetings/${id}/reprocess`).then(() => { queryClient.invalidateQueries(['meeting', id]); toast.success('Reprocessing started'); })} className="btn-danger text-sm py-1.5">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      {meeting.status === 'completed' && (
        <>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="animate-fade-in">
            {activeTab === 'summary' && <SummaryTab summary={meeting.summary} />}
            {activeTab === 'transcript' && <TranscriptTab transcription={meeting.transcription} />}
            {activeTab === 'tasks' && <TasksTab tasks={meeting.tasks} meetingId={id} />}
            {activeTab === 'insights' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {meeting.summary?.keyTopics?.map((t, i) => (
                  <div key={i} className="card p-4">
                    <p className="font-medium text-slate-800">{t.topic}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.round(t.relevance * 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{Math.round(t.relevance * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
