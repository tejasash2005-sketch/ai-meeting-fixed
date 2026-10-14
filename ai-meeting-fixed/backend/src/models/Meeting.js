const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Meeting title is required'], trim: true, maxlength: 200 },
  description: { type: String, default: null, maxlength: 1000 },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String },
    name: { type: String },
    role: { type: String, enum: ['host', 'co-host', 'attendee'], default: 'attendee' },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    speakingTime: { type: Number, default: 0 }, // seconds
  }],
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  platform: { type: String, enum: ['zoom', 'google_meet', 'microsoft_teams', 'manual_upload', 'recorded'], default: 'manual_upload' },
  externalMeetingId: { type: String, default: null },
  meetingUrl: { type: String, default: null },
  status: { type: String, enum: ['scheduled', 'recording', 'processing', 'completed', 'failed', 'cancelled'], default: 'scheduled' },
  processingStage: { type: String, enum: ['uploading', 'transcribing', 'summarizing', 'extracting_tasks', 'done', null], default: null },
  processingProgress: { type: Number, default: 0, min: 0, max: 100 },
  scheduledAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // seconds
  recording: {
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: 0 }, // bytes
    mimeType: { type: String, default: null },
    duration: { type: Number, default: 0 },
    isProcessed: { type: Boolean, default: false },
  },
  tags: [{ type: String, trim: true }],
  category: { type: String, enum: ['standup', 'planning', 'review', 'client', 'interview', 'brainstorm', 'other'], default: 'other' },
  isPrivate: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  calendarEventId: { type: String, default: null },
  language: { type: String, default: 'en' },
  jobId: { type: String, default: null }, // Bull queue job ID
  errorMessage: { type: String, default: null },
  viewCount: { type: Number, default: 0 },
  shareToken: { type: String, default: null },
  sharedWith: [{ type: String }], // email list for sharing
  aiInsights: {
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative', null], default: null },
    engagementScore: { type: Number, default: null },
    keyTopics: [{ type: String }],
    actionItemsCount: { type: Number, default: 0 },
    decisionsCount: { type: Number, default: 0 },
    questionsRaised: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

MeetingSchema.virtual('durationFormatted').get(function () {
  const d = this.duration;
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = d % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
});

MeetingSchema.index({ host: 1 });
MeetingSchema.index({ teamId: 1 });
MeetingSchema.index({ status: 1 });
MeetingSchema.index({ scheduledAt: -1 });
MeetingSchema.index({ createdAt: -1 });
MeetingSchema.index({ tags: 1 });
MeetingSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Meeting', MeetingSchema);
