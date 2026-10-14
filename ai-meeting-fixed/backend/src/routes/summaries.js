const express = require('express');
const router = express.Router();
const Summary = require('../models/Summary');
const Transcription = require('../models/Transcription');
const Meeting = require('../models/Meeting');
const aiService = require('../services/aiService');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/:meetingId', async (req, res, next) => {
  try {
    const summary = await Summary.findOne({ meetingId: req.params.meetingId });
    if (!summary) return res.status(404).json({ success: false, message: 'Summary not found' });
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

router.put('/:meetingId', async (req, res, next) => {
  try {
    const summary = await Summary.findOneAndUpdate(
      { meetingId: req.params.meetingId },
      { ...req.body, isEdited: true },
      { new: true }
    );
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

router.post('/:meetingId/regenerate', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId);
    const transcription = await Transcription.findOne({ meetingId: req.params.meetingId });
    if (!transcription) return res.status(404).json({ success: false, message: 'No transcription found' });

    const summaryData = await aiService.generateSummary(transcription.rawText, {
      title: meeting?.title,
      date: meeting?.scheduledAt,
      duration: Math.round((meeting?.duration || 0) / 60),
    });

    const summary = await Summary.findOneAndUpdate(
      { meetingId: req.params.meetingId },
      { ...summaryData, regeneratedAt: new Date(), status: 'completed' },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

router.get('/:meetingId/export', async (req, res, next) => {
  try {
    const summary = await Summary.findOne({ meetingId: req.params.meetingId });
    const meeting = await Meeting.findById(req.params.meetingId);
    if (!summary) return res.status(404).json({ success: false, message: 'Summary not found' });

    const text = [
      `MEETING SUMMARY: ${meeting?.title || 'Untitled'}`,
      `Date: ${meeting?.scheduledAt ? new Date(meeting.scheduledAt).toLocaleDateString() : 'N/A'}`,
      '',
      '--- OVERVIEW ---',
      summary.brief,
      '',
      '--- KEY DECISIONS ---',
      ...(summary.keyDecisions || []).map(d => `• ${d.decision}`),
      '',
      '--- ACTION ITEMS ---',
      ...(summary.nextSteps || []).map(s => `• ${s}`),
      '',
      '--- FOLLOW UPS ---',
      ...(summary.followUps || []).map(f => `• ${f}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${req.params.meetingId}.txt"`);
    res.send(text);
  } catch (err) { next(err); }
});

module.exports = router;
