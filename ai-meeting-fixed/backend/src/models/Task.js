const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: 300 },
  description: { type: String, default: null },
  assignedTo: {
    name: { type: String, default: null },
    email: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  assignedBy: {
    name: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  dueDate: { type: Date, default: null },
  dueDateConfidence: { type: Number, min: 0, max: 1, default: 0 }, // AI confidence in extracted date
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'], default: 'pending' },
  category: { type: String, enum: ['action_item', 'follow_up', 'decision', 'blocker', 'research', 'other'], default: 'action_item' },
  transcriptReference: {
    text: { type: String, default: null }, // original text from transcript
    startTime: { type: Number, default: null }, // seconds in recording
    endTime: { type: Number, default: null },
    speaker: { type: String, default: null },
  },
  aiExtracted: { type: Boolean, default: true },
  aiConfidence: { type: Number, min: 0, max: 1, default: 0 },
  tags: [{ type: String }],
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  completedAt: { type: Date, default: null },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, default: null },
  calendarEventId: { type: String, default: null },
  isArchived: { type: Boolean, default: false },
  reminders: [{
    type: { type: String, enum: ['email', 'notification', 'both'] },
    sendAt: { type: Date },
    sent: { type: Boolean, default: false },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

TaskSchema.virtual('isOverdue').get(function () {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

TaskSchema.pre('save', function (next) {
  if (this.dueDate && this.dueDate < new Date() && this.status === 'pending') {
    this.status = 'overdue';
  }
  next();
});

TaskSchema.index({ meetingId: 1 });
TaskSchema.index({ userId: 1 });
TaskSchema.index({ 'assignedTo.userId': 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ teamId: 1 });

module.exports = mongoose.model('Task', TaskSchema);
