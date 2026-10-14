const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Meeting = require('../models/Meeting');
const Transcription = require('../models/Transcription');
const Summary = require('../models/Summary');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const meetingProcessingService = require('../services/meetingProcessingService');
const logger = require('../utils/logger');

// All routes require auth
router.use(protect);

// @GET /api/meetings - List meetings
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, category, search, sortBy = 'createdAt', order = 'desc', archived } = req.query;
    const query = { host: req.user._id };

    if (status) query.status = status;
    if (category) query.category = category;
    if (archived === 'true') query.isArchived = true;
    else if (archived !== 'all') query.isArchived = { $ne: true };
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [meetings, total] = await Promise.all([
      Meeting.find(query).sort(sortObj).skip(skip).limit(parseInt(limit)).populate('host', 'firstName lastName avatar').lean(),
      Meeting.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: meetings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

// @POST /api/meetings - Create meeting
router.post('/', async (req, res, next) => {
  try {
    const { title, description, platform, scheduledAt, participants, tags, category, isPrivate, language } = req.body;
    const meeting = await Meeting.create({
      title, description, platform, scheduledAt, participants, tags, category, isPrivate, language,
      host: req.user._id,
      teamId: req.user.teamId,
    });
    res.status(201).json({ success: true, data: meeting });
  } catch (err) { next(err); }
});

// @GET /api/meetings/:id - Get single meeting
router.get('/:id', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('host', 'firstName lastName avatar email');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.host._id.toString() !== req.user._id.toString() && req.user.role === 'user')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    meeting.viewCount += 1;
    await meeting.save();

    const [transcription, summary, tasks] = await Promise.all([
      Transcription.findOne({ meetingId: req.params.id }).lean(),
      Summary.findOne({ meetingId: req.params.id }).lean(),
      Task.find({ meetingId: req.params.id, isArchived: false }).sort({ dueDate: 1 }).lean(),
    ]);

    res.json({ success: true, data: { ...meeting.toObject(), transcription, summary, tasks } });
  } catch (err) { next(err); }
});

// @PUT /api/meetings/:id - Update meeting
router.put('/:id', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.host.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const allowed = ['title', 'description', 'tags', 'category', 'participants', 'isPrivate', 'isArchived'];
    allowed.forEach(f => { if (req.body[f] !== undefined) meeting[f] = req.body[f]; });
    await meeting.save();
    res.json({ success: true, data: meeting });
  } catch (err) { next(err); }
});

// @DELETE /api/meetings/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.host.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    // Delete recording file if exists
    if (meeting.recording?.fileUrl) {
      const filePath = path.join(__dirname, '../../uploads', meeting.recording.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Promise.all([
      Meeting.findByIdAndDelete(req.params.id),
      Transcription.deleteOne({ meetingId: req.params.id }),
      Summary.deleteOne({ meetingId: req.params.id }),
      Task.deleteMany({ meetingId: req.params.id }),
    ]);

    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (err) { next(err); }
});

// @POST /api/meetings/:id/upload - Upload recording
router.post('/:id/upload', uploadLimiter, upload.single('recording'), handleMulterError, async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (meeting.host.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    meeting.recording = {
      fileUrl: `/recordings/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      isProcessed: false,
    };
    meeting.status = 'processing';
    meeting.processingStage = 'uploading';
    meeting.processingProgress = 5;
    await meeting.save();

    // Process asynchronously
    const filePath = path.join(__dirname, '../../uploads/recordings', req.file.filename);
    meetingProcessingService.processRecording(meeting._id, filePath, { language: meeting.language })
      .catch(err => logger.error(`Async processing failed: ${err.message}`));

    res.json({
      success: true,
      message: 'Recording uploaded. Processing started.',
      data: { meetingId: meeting._id, status: 'processing' },
    });
  } catch (err) { next(err); }
});

// @POST /api/meetings/:id/reprocess
router.post('/:id/reprocess', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    if (!meeting.recording?.fileUrl) return res.status(400).json({ success: false, message: 'No recording file found' });

    await Meeting.findByIdAndUpdate(req.params.id, { status: 'processing', processingProgress: 0, processingStage: 'transcribing' });
    const filePath = path.join(__dirname, '../../uploads', meeting.recording.fileUrl);

    meetingProcessingService.processRecording(meeting._id, filePath)
      .catch(err => logger.error(`Reprocess failed: ${err.message}`));

    res.json({ success: true, message: 'Reprocessing started' });
  } catch (err) { next(err); }
});

// @GET /api/meetings/:id/status
router.get('/:id/status', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id).select('status processingStage processingProgress errorMessage aiInsights');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting });
  } catch (err) { next(err); }
});

// @POST /api/meetings/:id/share
router.post('/:id/share', async (req, res, next) => {
  try {
    const { emails } = req.body;
    const crypto = require('crypto');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting.shareToken) {
      meeting.shareToken = crypto.randomBytes(16).toString('hex');
      meeting.sharedWith = emails || [];
      await meeting.save();
    }
    const shareUrl = `${process.env.CLIENT_URL}/shared/${meeting.shareToken}`;
    res.json({ success: true, data: { shareUrl, token: meeting.shareToken } });
  } catch (err) { next(err); }
});

module.exports = router;
