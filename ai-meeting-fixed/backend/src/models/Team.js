const mongoose = require('mongoose');

/* =======================
   TEAM SCHEMA
======================= */
const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: null },
  slug: { type: String, unique: true, lowercase: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  avatar: { type: String, default: null },
  settings: {
    defaultMeetingPrivacy: { type: String, enum: ['team', 'private'], default: 'team' },
    autoShareSummaries: { type: Boolean, default: true },
    allowExternalSharing: { type: Boolean, default: false },
    storageLimit: { type: Number, default: 107374182400 }, // 100GB
  },
  inviteCode: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
  plan: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], default: 'free' },
  meetingsCount: { type: Number, default: 0 },
  storageUsed: { type: Number, default: 0 },
}, { timestamps: true });

TeamSchema.index({ owner: 1 });
TeamSchema.index({ 'members.user': 1 });
TeamSchema.index({ slug: 1 });

/* =======================
   NOTIFICATION SCHEMA (single clean version)
======================= */
const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'meeting_processed',
      'meeting_completed',
      'task_assigned',
      'task_due',
      'task_overdue',
      'summary_ready',
      'transcription_ready',
      'team_invite',
      'meeting_shared',
      'mention',
      'system',
      'share_received'
    ],
    default: 'system'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  link: { type: String, default: null },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

/* =======================
   EXPORTS (clean & correct)
======================= */
const Team = mongoose.model('Team', TeamSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = {
  Team,
  Notification
};