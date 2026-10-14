const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const LiveRoomSchema = new mongoose.Schema({
  roomCode: { type: String, unique: true, default: () => Math.random().toString(36).substr(2, 9).toUpperCase() },
  title: { type: String, required: true, trim: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['waiting', 'live', 'ended'], default: 'waiting' },
  password: { type: String, default: null },
  maxParticipants: { type: Number, default: 50 },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date,
    isMuted: { type: Boolean, default: false },
    isVideoOff: { type: Boolean, default: false },
    isHost: { type: Boolean, default: false },
    socketId: String,
  }],
  chat: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
  }],
  startedAt: Date,
  endedAt: Date,
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', default: null }, // linked after processing
  settings: {
    waitingRoom: { type: Boolean, default: false },
    muteOnEntry: { type: Boolean, default: false },
    allowChat: { type: Boolean, default: true },
    allowScreenShare: { type: Boolean, default: true },
    recordingEnabled: { type: Boolean, default: false },
  }
}, { timestamps: true });

module.exports = mongoose.model('LiveRoom', LiveRoomSchema);
