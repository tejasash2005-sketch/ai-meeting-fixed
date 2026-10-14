const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const { protect } = require('../middleware/auth');

router.use(protect);

// @GET /api/tasks - All tasks for user
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority, meetingId, assignedTo, search, overdue } = req.query;
    const query = { userId: req.user._id, isArchived: false };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (meetingId) query.meetingId = meetingId;
    if (assignedTo) query['assignedTo.name'] = { $regex: assignedTo, $options: 'i' };
    if (overdue === 'true') { query.dueDate = { $lt: new Date() }; query.status = { $ne: 'completed' }; }
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tasks, total] = await Promise.all([
      Task.find(query).sort({ dueDate: 1, priority: -1 }).skip(skip).limit(parseInt(limit))
        .populate('meetingId', 'title scheduledAt').lean(),
      Task.countDocuments(query),
    ]);

    res.json({
      success: true, data: tasks,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

// @POST /api/tasks - Create task manually
router.post('/', async (req, res, next) => {
  try {
    const task = await Task.create({ ...req.body, userId: req.user._id, aiExtracted: false });
    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
});

// @GET /api/tasks/stats
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const [total, completed, pending, overdue, urgent] = await Promise.all([
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'completed' }),
      Task.countDocuments({ userId, status: 'pending' }),
      Task.countDocuments({ userId, dueDate: { $lt: now }, status: { $nin: ['completed', 'cancelled'] } }),
      Task.countDocuments({ userId, priority: 'urgent', status: { $nin: ['completed', 'cancelled'] } }),
    ]);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    res.json({ success: true, data: { total, completed, pending, overdue, urgent, completionRate } });
  } catch (err) { next(err); }
});

// @GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('meetingId', 'title scheduledAt');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

// @PUT /api/tasks/:id
router.put('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const allowed = ['title', 'description', 'assignedTo', 'dueDate', 'priority', 'status', 'notes', 'tags'];
    allowed.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });

    if (req.body.status === 'completed' && task.status !== 'completed') {
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    }
    await task.save();
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

// @PATCH /api/tasks/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'completed') { update.completedAt = new Date(); update.completedBy = req.user._id; }
    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

// @DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
});

// @POST /api/tasks/bulk-update
router.post('/bulk-update', async (req, res, next) => {
  try {
    const { ids, update } = req.body;
    await Task.updateMany({ _id: { $in: ids }, userId: req.user._id }, update);
    res.json({ success: true, message: `${ids.length} tasks updated` });
  } catch (err) { next(err); }
});

module.exports = router;
