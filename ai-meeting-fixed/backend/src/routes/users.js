const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

router.use(protect);

// @GET /api/users/profile
router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('teamId', 'name avatar');
    const [meetingsCount, tasksCount] = await Promise.all([
      Meeting.countDocuments({ host: req.user._id }),
      Task.countDocuments({ userId: req.user._id }),
    ]);
    res.json({ success: true, data: { ...user.toObject(), meetingsCount, tasksCount } });
  } catch (err) { next(err); }
});

// @PUT /api/users/profile
router.put('/profile', async (req, res, next) => {
  try {
    const allowed = ['firstName', 'lastName', 'jobTitle', 'department', 'phone', 'timezone', 'preferences'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// @POST /api/users/avatar
router.post('/avatar', upload.single('avatar'), handleMulterError, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // Delete old avatar
    if (req.user.avatar) {
      const oldPath = path.join(__dirname, '../../uploads/avatars', path.basename(req.user.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true });
    res.json({ success: true, data: { avatar: user.avatar } });
  } catch (err) { next(err); }
});

// @GET /api/users/dashboard-stats
router.get('/dashboard-stats', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      totalMeetings, recentMeetings, completedMeetings,
      totalTasks, pendingTasks, overdueTasks, completedTasks
    ] = await Promise.all([
      Meeting.countDocuments({ host: userId }),
      Meeting.countDocuments({ host: userId, createdAt: { $gte: thirtyDaysAgo } }),
      Meeting.countDocuments({ host: userId, status: 'completed' }),
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'pending' }),
      Task.countDocuments({ userId, dueDate: { $lt: new Date() }, status: { $nin: ['completed', 'cancelled'] } }),
      Task.countDocuments({ userId, status: 'completed' }),
    ]);

    const recentMeetingsList = await Meeting.find({ host: userId })
      .sort({ createdAt: -1 }).limit(5)
      .select('title status processingStage duration createdAt aiInsights').lean();

    const upcomingTasks = await Task.find({
      userId, status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $gte: new Date() },
    }).sort({ dueDate: 1 }).limit(5).populate('meetingId', 'title').lean();

    res.json({
      success: true,
      data: {
        meetings: { total: totalMeetings, recent: recentMeetings, completed: completedMeetings },
        tasks: { total: totalTasks, pending: pendingTasks, overdue: overdueTasks, completed: completedTasks },
        recentMeetings: recentMeetingsList,
        upcomingTasks,
        storageUsed: req.user.storageUsed,
        storageLimit: req.user.storageLimit,
      },
    });
  } catch (err) { next(err); }
});

// @PUT /api/users/preferences
router.put('/preferences', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id, { preferences: req.body }, { new: true }
    );
    res.json({ success: true, data: user.preferences });
  } catch (err) { next(err); }
});

// @DELETE /api/users/account
router.delete('/account', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
