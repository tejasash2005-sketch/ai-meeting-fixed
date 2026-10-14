const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const Transcription = require('../models/Transcription');
const { Notification } = require('../models/Team');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'superadmin'));

// @GET /api/admin/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newUsers, activeUsers,
      totalMeetings, recentMeetings, processingMeetings,
      totalTasks, completedTasks,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ lastLogin: { $gte: sevenDaysAgo } }),
      Meeting.countDocuments(),
      Meeting.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Meeting.countDocuments({ status: { $in: ['processing', 'recording'] } }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
    ]);

    // Growth metrics (daily for last 30 days)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const meetingGrowth = await Meeting.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Top users by meetings
    const topUsers = await Meeting.aggregate([
      { $group: { _id: '$host', meetingsCount: { $sum: 1 } } },
      { $sort: { meetingsCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { 'user.firstName': 1, 'user.lastName': 1, 'user.email': 1, meetingsCount: 1 } },
    ]);

    // Meeting status distribution
    const meetingsByStatus = await Meeting.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Platform distribution
    const meetingsByPlatform = await Meeting.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          users: { total: totalUsers, new: newUsers, active: activeUsers },
          meetings: { total: totalMeetings, recent: recentMeetings, processing: processingMeetings },
          tasks: { total: totalTasks, completed: completedTasks, completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0 },
        },
        charts: { userGrowth, meetingGrowth, meetingsByStatus, meetingsByPlatform },
        topUsers,
      },
    });
  } catch (err) { next(err); }
});

// @GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, isActive, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = {};
    if (search) query.$or = [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ [sortBy]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

// @GET /api/admin/users/:id
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const [meetingsCount, tasksCount] = await Promise.all([
      Meeting.countDocuments({ host: user._id }),
      Task.countDocuments({ userId: user._id }),
    ]);
    res.json({ success: true, data: { ...user.toObject(), meetingsCount, tasksCount } });
  } catch (err) { next(err); }
});

// @PUT /api/admin/users/:id
router.put('/users/:id', async (req, res, next) => {
  try {
    const { role, isActive, storageLimit } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role, isActive, storageLimit }, { new: true });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// @DELETE /api/admin/users/:id
router.delete('/users/:id', authorize('superadmin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
});

// @GET /api/admin/meetings
router.get('/meetings', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, userId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (userId) query.host = userId;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [meetings, total] = await Promise.all([
      Meeting.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
        .populate('host', 'firstName lastName email avatar').lean(),
      Meeting.countDocuments(query),
    ]);

    res.json({ success: true, data: meetings, pagination: { total, pages: Math.ceil(total / parseInt(limit)), page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
});

// @POST /api/admin/broadcast
router.post('/broadcast', async (req, res, next) => {
  try {
    const { title, message, type = 'system', roles } = req.body;
    const query = roles ? { role: { $in: roles } } : {};
    const users = await User.find(query).select('_id');
    const notifications = users.map(u => ({ userId: u._id, type, title, message, priority: 'high' }));
    const { Notification } = require('../models/Team');
    await Notification.insertMany(notifications);
    res.json({ success: true, message: `Broadcast sent to ${users.length} users` });
  } catch (err) { next(err); }
});

// @GET /api/admin/system-health
router.get('/system-health', async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const [totalMeetings, processingMeetings, failedMeetings] = await Promise.all([
      Meeting.countDocuments(),
      Meeting.countDocuments({ status: 'processing' }),
      Meeting.countDocuments({ status: 'failed' }),
    ]);
    res.json({
      success: true,
      data: {
        database: { status: dbStatus },
        meetings: { total: totalMeetings, processing: processingMeetings, failed: failedMeetings },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        timestamp: new Date(),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
