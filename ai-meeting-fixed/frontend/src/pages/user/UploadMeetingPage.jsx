import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileAudio, X, CheckCircle, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ACCEPTED = ['.mp3', '.mp4', '.wav', '.m4a', '.ogg', '.flac', '.webm', '.aac', '.mov'];

export default function UploadMeetingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    title: '', description: '', category: 'other', platform: 'manual_upload',
    language: 'en', scheduledAt: '', tags: '',
  });

  const handleFile = (f) => {
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED.includes(ext)) return toast.error(`File type ${ext} not supported`);
    if (f.size > 500 * 1024 * 1024) return toast.error('File too large (max 500MB)');
    setFile(f);
    if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^/.]+$/, '') }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a recording file');
    if (!form.title.trim()) return toast.error('Meeting title is required');
    setUploading(true);
    setProgress(0);

    try {
      // 1. Create meeting
      const meetingRes = await api.post('/meetings', {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      });
      const meetingId = meetingRes.data.data._id;

      // 2. Upload file
      const formData = new FormData();
      formData.append('recording', file);
      await api.post(`/meetings/${meetingId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      });

      toast.success('Meeting uploaded! AI processing started.');
      navigate(`/meetings/${meetingId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/meetings')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to meetings
          </button>
          <h1 className="page-title">Upload Meeting Recording</h1>
          <p className="text-slate-500 text-sm mt-1">Upload an audio or video file to transcribe, summarize, and extract tasks.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${dragging ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept={ACCEPTED.join(',')} className="hidden" onChange={e => handleFile(e.target.files[0])} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <div className="text-left">
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                className="ml-auto p-1 hover:bg-slate-100 rounded">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ) : (
            <>
              <FileAudio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Drop your recording here</p>
              <p className="text-sm text-slate-400 mt-1">or click to browse</p>
              <p className="text-xs text-slate-400 mt-3">{ACCEPTED.join(', ')} · Max 500MB</p>
            </>
          )}
        </div>

        {/* Form fields */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">Meeting Details</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input className="input" placeholder="Q3 Sprint Planning" required
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea className="input resize-none h-20" placeholder="What was this meeting about?"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Platform</label>
              <select className="input" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
                <option value="manual_upload">Manual Upload</option>
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="microsoft_teams">MS Teams</option>
                <option value="recorded">Other Recording</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="standup">Daily Standup</option>
                <option value="planning">Sprint Planning</option>
                <option value="review">Review</option>
                <option value="client">Client Meeting</option>
                <option value="interview">Interview</option>
                <option value="brainstorm">Brainstorm</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
              <select className="input" value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="auto">Auto-detect</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date (optional)</label>
              <input type="datetime-local" className="input"
                value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
            <input className="input" placeholder="sprint, q3, engineering (comma-separated)"
              value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              <span className="text-sm font-medium text-slate-700">
                {progress < 100 ? `Uploading... ${progress}%` : 'Processing with AI...'}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* AI info */}
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-primary-800">
            <p className="font-medium">AI Processing includes:</p>
            <ul className="mt-1 space-y-0.5 text-primary-700">
              <li>• Whisper speech-to-text transcription</li>
              <li>• GPT-4 meeting summarization</li>
              <li>• Automatic task & deadline extraction</li>
              <li>• Speaker identification & sentiment analysis</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/meetings')} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button type="submit" disabled={uploading || !file} className="btn-primary flex-1 justify-center">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Upload className="w-4 h-4" /> Upload & Process</>}
          </button>
        </div>
      </form>
    </div>
  );
}
