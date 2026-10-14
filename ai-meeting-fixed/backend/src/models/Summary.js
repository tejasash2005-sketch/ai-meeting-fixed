const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brief: { type: String, default: '' },
  detailed: { type: String, default: '' },
  bulletPoints: [{ type: String }],
  keyDecisions: [{
    decision: { type: String },
    madeBy: { type: String },
    timestamp: { type: Number },
    context: { type: String },
  }],
  keyDiscussionPoints: [{
    topic: { type: String },
    summary: { type: String },
    participants: [{ type: String }],
    duration: { type: Number }, // seconds
  }],
  followUps: [{ type: String }],
  risks: [{ type: String }],
  nextSteps: [{ type: String }],
  openQuestions: [{ type: String }],
  agenda: [{ type: String }],
  chapters: [{
    title: { type: String },
    startTime: { type: Number }, // seconds
    endTime: { type: Number },
    summary: { type: String }
  }],
  meetingType: { type: String },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
  sentimentScore: { type: Number, min: -1, max: 1 },
  engagementScore: { type: Number, min: 0, max: 100 },
  keyTopics: [{ topic: String, frequency: Number, relevance: Number }],
  model: { type: String, default: 'gpt-4' },
  promptVersion: { type: String, default: '1.0' },
  processingTime: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  isEdited: { type: Boolean, default: false },
  regeneratedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

SummarySchema.index({ meetingId: 1 });
SummarySchema.index({ userId: 1 });

module.exports = mongoose.model('Summary', SummarySchema);
