const mongoose = require('mongoose');

const TranscriptionSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rawText: { type: String, default: '' },
  formattedText: { type: String, default: '' },
  language: { type: String, default: 'en' },
  confidence: { type: Number, default: 0, min: 0, max: 1 },
  wordCount: { type: Number, default: 0 },
  segments: [{
    id: { type: Number },
    start: { type: Number }, // seconds
    end: { type: Number },   // seconds
    text: { type: String },
    speaker: { type: String, default: 'Unknown' },
    confidence: { type: Number },
    words: [{
      word: String,
      start: Number,
      end: Number,
      confidence: Number,
    }],
  }],
  speakers: [{
    label: { type: String }, // "SPEAKER_00", etc
    name: { type: String, default: null },
    speakingTime: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    turnCount: { type: Number, default: 0 },
  }],
  engine: { type: String, enum: ['whisper', 'google', 'deepgram', 'mock'], default: 'whisper' },
  whisperModel: { type: String, default: 'whisper-1' },
  processingTime: { type: Number, default: 0 }, // ms
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  errorMessage: { type: String, default: null },
  isEdited: { type: Boolean, default: false },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  editedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

TranscriptionSchema.index({ meetingId: 1 });
TranscriptionSchema.index({ userId: 1 });
TranscriptionSchema.index({ rawText: 'text' });

module.exports = mongoose.model('Transcription', TranscriptionSchema);
