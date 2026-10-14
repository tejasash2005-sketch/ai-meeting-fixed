const express = require('express');
const router = express.Router();
const LiveRoom = require('../models/LiveRoom');
const Meeting = require('../models/Meeting');
const { protect } = require('../middleware/auth');

router.use(protect);

// POST /api/live/create — Host creates a room
router.post('/create', async (req, res, next) => {
  try {
    const { title, password, settings } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });

    const room = await LiveRoom.create({
      title,
      host: req.user._id,
      password: password || null,
      settings: settings || {},
      participants: [{
        userId: req.user._id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        isHost: true,
      }]
    });

    res.status(201).json({ success: true, data: room });
  } catch (err) { next(err); }
});

// POST /api/live/join — Join by room code
router.post('/join', async (req, res, next) => {
  try {
    const { roomCode, password } = req.body;
    if (!roomCode) return res.status(400).json({ success: false, message: 'Room code required' });

    const room = await LiveRoom.findOne({ roomCode: roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found. Check the code and try again.' });
    if (room.status === 'ended') return res.status(400).json({ success: false, message: 'This meeting has ended.' });
    if (room.password && room.password !== password)
      return res.status(401).json({ success: false, message: 'Wrong password' });
    if (room.participants.length >= room.maxParticipants)
      return res.status(400).json({ success: false, message: 'Meeting is full' });

    // Add participant if not already in
    const already = room.participants.find(p => p.userId?.toString() === req.user._id.toString());
    if (!already) {
      room.participants.push({
        userId: req.user._id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        isHost: false,
      });
      await room.save();
    }

    res.json({ success: true, data: room });
  } catch (err) { next(err); }
});

// GET /api/live/:roomCode — Get room info
router.get('/:roomCode', async (req, res, next) => {
  try {
    const room = await LiveRoom.findOne({ roomCode: req.params.roomCode.toUpperCase() })
      .populate('host', 'firstName lastName avatar');
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
});

// PATCH /api/live/:roomCode/start — Host starts the meeting
router.patch('/:roomCode/start', async (req, res, next) => {
  try {
    const room = await LiveRoom.findOne({ roomCode: req.params.roomCode });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Only the host can start the meeting' });

    room.status = 'live';
    room.startedAt = new Date();
    await room.save();

    res.json({ success: true, data: room });
  } catch (err) { next(err); }
});

// PATCH /api/live/:roomCode/end — Host ends the meeting
router.patch('/:roomCode/end', async (req, res, next) => {
  try {
    const room = await LiveRoom.findOne({ roomCode: req.params.roomCode });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Only the host can end the meeting' });

    room.status = 'ended';
    room.endedAt = new Date();
    await room.save();

    res.json({ success: true, data: room, message: 'Meeting ended. Upload a recording to get AI analysis.' });
  } catch (err) { next(err); }
});

// POST /api/live/:roomCode/chat — Send chat message
router.post('/:roomCode/chat', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Empty message' });

    const room = await LiveRoom.findOne({ roomCode: req.params.roomCode });
    if (!room || room.status === 'ended')
      return res.status(400).json({ success: false, message: 'Room not available' });

    room.chat.push({
      userId: req.user._id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      message: message.trim(),
    });
    await room.save();

    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/live/my/rooms — List host's rooms
router.get('/my/rooms', async (req, res, next) => {
  try {
    const rooms = await LiveRoom.find({ host: req.user._id })
      .sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, data: rooms });
  } catch (err) { next(err); }
});

module.exports = router;
