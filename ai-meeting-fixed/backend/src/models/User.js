const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true, maxlength: 50 },
  lastName: { type: String, required: [true, 'Last name is required'], trim: true, maxlength: 50 },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
  },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  avatar: { type: String, default: null },
  department: { type: String, default: null },
  jobTitle: { type: String, default: null },
  phone: { type: String, default: null },
  timezone: { type: String, default: 'UTC' },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  lastLogin: { type: Date, default: null },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    defaultSummaryLength: { type: String, enum: ['brief', 'detailed', 'comprehensive'], default: 'detailed' },
    autoExtractTasks: { type: Boolean, default: true },
    calendarSync: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  },
  integrations: {
    google: { connected: { type: Boolean, default: false }, accessToken: String, refreshToken: String, tokenExpiry: Date },
    zoom: { connected: { type: Boolean, default: false }, accessToken: String, refreshToken: String, userId: String },
    microsoft: { connected: { type: Boolean, default: false }, accessToken: String, refreshToken: String },
  },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  storageUsed: { type: Number, default: 0 },
  storageLimit: { type: Number, default: 5368709120 }, // 5GB default
  meetingsCount: { type: Number, default: 0 },
  totalRecordingMinutes: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('storageUsedGB').get(function () {
  return (this.storageUsed / 1073741824).toFixed(2);
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

UserSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ teamId: 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', UserSchema);
