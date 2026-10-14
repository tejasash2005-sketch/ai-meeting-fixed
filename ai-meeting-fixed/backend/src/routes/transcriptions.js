// transcriptions.js
const express = require('express');
const router = express.Router();
const Transcription = require('../models/Transcription');
const Meeting = require('../models/Meeting');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const transcriptions = await Transcription.find({ userId: req.user._id })
      .populate('meetingId', 'title')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: transcriptions });
  } catch (err) { next(err); }
});

router.get('/:meetingId', async (req, res, next) => {
  try {
    const transcription = await Transcription.findOne({ meetingId: req.params.meetingId });
    if (!transcription) return res.status(404).json({ success: false, message: 'Transcription not found' });
    res.json({ success: true, data: transcription });
  } catch (err) { next(err); }
});

router.put('/:meetingId', async (req, res, next) => {
  try {
    const transcription = await Transcription.findOneAndUpdate(
      { meetingId: req.params.meetingId },
      { ...req.body, isEdited: true, editedBy: req.user._id, editedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: transcription });
  } catch (err) { next(err); }
});

router.get('/:meetingId/download', async (req, res, next) => {
  try {
    const transcription = await Transcription.findOne({ meetingId: req.params.meetingId });
    if (!transcription) return res.status(404).json({ success: false, message: 'Not found' });
    const format = req.query.format || 'txt';
    if (format === 'txt') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="transcript-${req.params.meetingId}.txt"`);
      return res.send(transcription.formattedText || transcription.rawText);
    }
    res.json({ success: true, data: transcription });
  } catch (err) { next(err); }
});

module.exports = router;
