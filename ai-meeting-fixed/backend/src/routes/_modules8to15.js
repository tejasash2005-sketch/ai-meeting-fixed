// ============================================================
// Module 8: Calendar Routes
// ============================================================
const express = require('express');
const calendarRouter = express.Router();
const { protect } = require('../middleware/auth');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');

calendarRouter.use(protect);

calendarRouter.get('/events', async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const query = { host: req.user._id };
    if (start && end) query.scheduledAt = { $gte: new Date(start), $lte: new Date(end) };

    const [meetings, tasks] = await Promise.all([
      Meeting.find(query).select('title status scheduledAt duration platform category').lean(),
      Task.find({ userId: req.user._id, dueDate: { $gte: new Date(start || 0), $lte: new Date(end || Date.now() + 365 * 24 * 60 * 60 * 1000) } })
        .select('title status priority dueDate meetingId').lean(),
    ]);

    const events = [
      ...meetings.map(m => ({ id: m._id, type: 'meeting', title: m.title, start: m.scheduledAt, status: m.status, platform: m.platform, category: m.category })),
      ...tasks.map(t => ({ id: t._id, type: 'task', title: t.title, start: t.dueDate, status: t.status, priority: t.priority, meetingId: t.meetingId })),
    ];

    res.json({ success: true, data: events });
  } catch (err) { next(err); }
});

calendarRouter.post('/sync/google', async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    // Google Calendar sync would use googleapis here
    // Placeholder response for now
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      'integrations.google.connected': true,
      'integrations.google.accessToken': accessToken,
    });
    res.json({ success: true, message: 'Google Calendar connected. Sync initiated.' });
  } catch (err) { next(err); }
});

calendarRouter.delete('/sync/google', async (req, res, next) => {
  try {
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      'integrations.google': { connected: false, accessToken: null, refreshToken: null },
    });
    res.json({ success: true, message: 'Google Calendar disconnected.' });
  } catch (err) { next(err); }
});

calendarRouter.get('/upcoming', async (req, res, next) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const meetings = await Meeting.find({
      host: req.user._id,
      scheduledAt: { $gte: now, $lte: nextWeek },
      status: 'scheduled',
    }).sort({ scheduledAt: 1 }).limit(10);
    res.json({ success: true, data: meetings });
  } catch (err) { next(err); }
});

module.exports.calendarRouter = calendarRouter;

// ============================================================
// Module 9: Analytics Routes
// ============================================================
const analyticsRouter = express.Router();
analyticsRouter.use(protect);

analyticsRouter.get('/overview', async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const userId = req.user._id;
    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const [meetingsByDay, tasksByStatus, topTopics, sentimentDist, avgDuration] = await Promise.all([
      Meeting.aggregate([
        { $match: { host: userId, createdAt: { $gte: daysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Task.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Meeting.aggregate([
        { $match: { host: userId, status: 'completed' } },
        { $unwind: '$aiInsights.keyTopics' },
        { $group: { _id: '$aiInsights.keyTopics', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
      ]),
      Meeting.aggregate([
        { $match: { host: userId, 'aiInsights.sentiment': { $ne: null } } },
        { $group: { _id: '$aiInsights.sentiment', count: { $sum: 1 } } },
      ]),
      Meeting.aggregate([
        { $match: { host: userId, status: 'completed', duration: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
    ]);

    const timeDistribution = await Meeting.aggregate([
      { $match: { host: userId, createdAt: { $gte: daysAgo } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        meetingsByDay,
        tasksByStatus,
        topTopics,
        sentimentDistribution: sentimentDist,
        avgMeetingDuration: avgDuration[0]?.avg || 0,
        timeDistribution,
      },
    });
  } catch (err) { next(err); }
});

analyticsRouter.get('/productivity', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const taskCompletionByWeek = await Task.aggregate([
      { $match: { userId, completedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $week: '$completedAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const avgTasksPerMeeting = await Task.aggregate([
      { $match: { userId } },
      { $group: { _id: '$meetingId', count: { $sum: 1 } } },
      { $group: { _id: null, avg: { $avg: '$count' } } },
    ]);

    res.json({
      success: true,
      data: {
        taskCompletionByWeek,
        avgTasksPerMeeting: avgTasksPerMeeting[0]?.avg || 0,
      },
    });
  } catch (err) { next(err); }
});

module.exports.analyticsRouter = analyticsRouter;

// ============================================================
// Module 10: Notifications Routes
// ============================================================
const notificationsRouter = express.Router();
const { Notification } = require('../models/Team');
notificationsRouter.use(protect);

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { userId: req.user._id };
    if (unreadOnly === 'true') query.isRead = false;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);
    res.json({ success: true, data: notifications, unreadCount, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

notificationsRouter.patch('/:id/read', async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) { next(err); }
});

notificationsRouter.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

notificationsRouter.delete('/:id', async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) { next(err); }
});

notificationsRouter.get('/unread-count', async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
});

module.exports.notificationsRouter = notificationsRouter;

// ============================================================
// Module 11: Integrations Routes
// ============================================================
const integrationsRouter = express.Router();
integrationsRouter.use(protect);

integrationsRouter.get('/status', async (req, res, next) => {
  try {
    const user = await require('../models/User').findById(req.user._id).select('integrations');
    res.json({ success: true, data: user.integrations });
  } catch (err) { next(err); }
});

integrationsRouter.post('/zoom/connect', async (req, res, next) => {
  const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${process.env.ZOOM_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.ZOOM_REDIRECT_URI)}`;
  res.json({ success: true, data: { authUrl } });
});

integrationsRouter.post('/zoom/disconnect', async (req, res, next) => {
  try {
    await require('../models/User').findByIdAndUpdate(req.user._id, { 'integrations.zoom': { connected: false } });
    res.json({ success: true, message: 'Zoom disconnected' });
  } catch (err) { next(err); }
});

integrationsRouter.get('/zoom/meetings', async (req, res, next) => {
  try {
    const user = await require('../models/User').findById(req.user._id).select('integrations');
    if (!user.integrations?.zoom?.connected)
      return res.status(400).json({ success: false, message: 'Zoom not connected' });
    // Real impl would call Zoom API here
    res.json({ success: true, data: { meetings: [], message: 'Connect Zoom API to fetch live meetings' } });
  } catch (err) { next(err); }
});

integrationsRouter.post('/microsoft/connect', (req, res) => {
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&response_type=code&scope=openid+profile+email`;
  res.json({ success: true, data: { authUrl } });
});

module.exports.integrationsRouter = integrationsRouter;

// ============================================================
// Module 12: Reports Routes
// ============================================================
const reportsRouter = express.Router();
reportsRouter.use(protect);

reportsRouter.get('/meeting/:meetingId', async (req, res, next) => {
  try {
    const [meeting, transcription, summary, tasks] = await Promise.all([
      Meeting.findById(req.params.meetingId).populate('host', 'firstName lastName email'),
      require('../models/Transcription').findOne({ meetingId: req.params.meetingId }),
      require('../models/Summary').findOne({ meetingId: req.params.meetingId }),
      Task.find({ meetingId: req.params.meetingId }).sort({ priority: -1 }),
    ]);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: { meeting, transcription, summary, tasks } });
  } catch (err) { next(err); }
});

reportsRouter.get('/weekly', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [meetings, tasks, completedTasks] = await Promise.all([
      Meeting.find({ host: userId, createdAt: { $gte: weekAgo } }).select('title status duration aiInsights').lean(),
      Task.countDocuments({ userId, createdAt: { $gte: weekAgo } }),
      Task.countDocuments({ userId, completedAt: { $gte: weekAgo } }),
    ]);
    res.json({ success: true, data: { period: 'weekly', meetings, tasksCreated: tasks, tasksCompleted: completedTasks, meetingsCount: meetings.length } });
  } catch (err) { next(err); }
});

reportsRouter.get('/export/tasks', async (req, res, next) => {
  try {
    const tasks = await Task.find({ userId: req.user._id }).populate('meetingId', 'title').lean();
    const rows = ['Title,Status,Priority,Assigned To,Due Date,Meeting', ...tasks.map(t =>
      `"${t.title}","${t.status}","${t.priority}","${t.assignedTo?.name || ''}","${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}","${t.meetingId?.title || ''}"`
    )];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.csv"');
    res.send(rows.join('\n'));
  } catch (err) { next(err); }
});

module.exports.reportsRouter = reportsRouter;

// ============================================================
// Module 13: Teams Routes
// ============================================================
const teamsRouter = express.Router();
const { Team } = require('../models/Team');
teamsRouter.use(protect);

teamsRouter.get('/my', async (req, res, next) => {
  try {
    const teams = await Team.find({ 'members.user': req.user._id })
      .populate('members.user', 'firstName lastName email avatar').lean();
    res.json({ success: true, data: teams });
  } catch (err) { next(err); }
});

teamsRouter.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const crypto = require('crypto');
    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
    const team = await Team.create({
      name, description, slug, owner: req.user._id,
      inviteCode: crypto.randomBytes(8).toString('hex'),
      members: [{ user: req.user._id, role: 'owner' }],
    });
    await require('../models/User').findByIdAndUpdate(req.user._id, { teamId: team._id });
    res.status(201).json({ success: true, data: team });
  } catch (err) { next(err); }
});

teamsRouter.post('/join', async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const team = await Team.findOne({ inviteCode });
    if (!team) return res.status(404).json({ success: false, message: 'Invalid invite code' });
    const alreadyMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'Already a member' });
    team.members.push({ user: req.user._id, role: 'member', invitedBy: req.user._id });
    await team.save();
    await require('../models/User').findByIdAndUpdate(req.user._id, { teamId: team._id });
    res.json({ success: true, data: team });
  } catch (err) { next(err); }
});

teamsRouter.get('/:id/members', async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).populate('members.user', 'firstName lastName email avatar role lastLogin');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team.members });
  } catch (err) { next(err); }
});

teamsRouter.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    team.members = team.members.filter(m => m.user.toString() !== req.params.userId);
    await team.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (err) { next(err); }
});

module.exports.teamsRouter = teamsRouter;

// ============================================================
// Module 14: Search Routes
// ============================================================
const searchRouter = express.Router();
searchRouter.use(protect);

searchRouter.get('/', async (req, res, next) => {
  try {
    const { q, type, page = 1, limit = 10 } = req.query;
    if (!q || q.trim().length < 2)
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });

    const regex = { $regex: q, $options: 'i' };
    const userId = req.user._id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let results = {};

    if (!type || type === 'meetings') {
      results.meetings = await Meeting.find({ host: userId, $or: [{ title: regex }, { description: regex }] })
        .select('title status createdAt duration platform').skip(skip).limit(parseInt(limit)).lean();
    }
    if (!type || type === 'tasks') {
      results.tasks = await Task.find({ userId, $or: [{ title: regex }, { description: regex }] })
        .select('title status priority dueDate meetingId').populate('meetingId', 'title').skip(skip).limit(parseInt(limit)).lean();
    }
    if (!type || type === 'transcriptions') {
      const transcriptions = await require('../models/Transcription').find({ userId, rawText: regex })
        .select('meetingId rawText').populate('meetingId', 'title createdAt').skip(skip).limit(parseInt(limit)).lean();
      results.transcriptions = transcriptions.map(t => {
        const idx = t.rawText?.toLowerCase().indexOf(q.toLowerCase()) || 0;
        return { ...t, excerpt: t.rawText?.substring(Math.max(0, idx - 100), idx + 200) + '...' };
      });
    }

    res.json({ success: true, query: q, data: results });
  } catch (err) { next(err); }
});

searchRouter.get('/suggestions', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });
    const meetings = await Meeting.find({ host: req.user._id, title: { $regex: q, $options: 'i' } })
      .select('title').limit(5).lean();
    res.json({ success: true, data: meetings.map(m => ({ type: 'meeting', text: m.title, id: m._id })) });
  } catch (err) { next(err); }
});

module.exports.searchRouter = searchRouter;

// ============================================================
// Module 15: Webhooks Routes
// ============================================================
const webhooksRouter = express.Router();

// Zoom webhook handler (no auth - uses webhook secret)
webhooksRouter.post('/zoom', async (req, res) => {
  try {
    const { event, payload } = req.body;
    if (event === 'endpoint.url_validation') {
      const crypto = require('crypto');
      const token = crypto.createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET || 'secret')
        .update(payload.plainToken).digest('hex');
      return res.json({ plainToken: payload.plainToken, encryptedToken: token });
    }
    if (event === 'recording.completed') {
      require('../utils/logger').info(`Zoom recording completed: ${payload?.object?.id}`);
      // TODO: Download and process zoom recording
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(200).json({ success: true }); // Always 200 for webhooks
  }
});

// Google Meet / Calendar webhook
webhooksRouter.post('/google', async (req, res) => {
  try {
    require('../utils/logger').info('Google webhook received', { headers: req.headers['x-goog-resource-state'] });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(200).json({ success: true });
  }
});

webhooksRouter.get('/health', (req, res) => res.json({ success: true, message: 'Webhooks endpoint active' }));

module.exports.webhooksRouter = webhooksRouter;

// Export all routers properly
module.exports = {
  calendarRouter,
  analyticsRouter,
  notificationsRouter,
  integrationsRouter,
  reportsRouter,
  teamsRouter,
  searchRouter,
  webhooksRouter,
};
