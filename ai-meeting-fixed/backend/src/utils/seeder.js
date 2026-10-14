require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Transcription = require('../models/Transcription');
const Summary = require('../models/Summary');
const Task = require('../models/Task');
const { Team } = require('../models/Team');
const logger = require('./logger');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_meeting_intelligence');
    logger.info('Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}), Meeting.deleteMany({}), Transcription.deleteMany({}),
      Summary.deleteMany({}), Task.deleteMany({}), Team.deleteMany({})
    ]);
    logger.info('Cleared existing data');

    // Create users
    const demoUser = await User.create({
      firstName: 'Jane', lastName: 'Smith',
      email: 'jane@demo.com', password: 'password123',
      role: 'user', isActive: true, isEmailVerified: true,
      jobTitle: 'Product Manager', department: 'Product',
    });

    const adminUser = await User.create({
      firstName: 'Admin', lastName: 'User',
      email: 'admin@demo.com', password: 'password123',
      role: 'admin', isActive: true, isEmailVerified: true,
    });

    // Create Teams
    const teams = [];
    const teamNames = ['Engineering Alpha', 'Product Strategy', 'Marketing Global', 'Customer Success', 'HR & Culture'];
    for (const name of teamNames) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const team = await Team.create({
        name,
        slug: `${slug}-${Math.random().toString(36).substring(7)}`,
        owner: demoUser._id,
        inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        members: [{ user: demoUser._id, role: 'owner' }],
      });
      teams.push(team);
    }
    logger.info(`Created ${teams.length} teams`);

    // Helper to create full meeting data
    const createFullMeeting = async (data, transcriptText, summaryData) => {
      const m = await Meeting.create({ ...data, host: demoUser._id });
      await Transcription.create({
        meetingId: m._id, userId: demoUser._id, status: 'completed',
        rawText: transcriptText,
        segments: [{ id: 0, start: 0, end: 10, text: transcriptText.substring(0, 50), speaker: 'Jane Smith' }]
      });
      await Summary.create({
        meetingId: m._id, userId: demoUser._id, status: 'completed',
        ...summaryData
      });
      return m;
    };

    // Generate historical data for analytics (last 30 days)
    logger.info('Generating historical analytics data...');
    const categories = ['standup', 'planning', 'review', 'client', 'brainstorm'];
    const platforms = ['zoom', 'google_meet', 'microsoft_teams'];
    const sentiments = ['positive', 'neutral', 'negative'];

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // 1-3 meetings per day
      const dailyCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < dailyCount; j++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        const duration = Math.floor(Math.random() * 3600) + 900;

        const m = await Meeting.create({
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} Session - Day ${30-i}`,
          host: demoUser._id,
          status: 'completed',
          platform,
          category,
          duration,
          createdAt: date,
          scheduledAt: date,
          aiInsights: {
            sentiment,
            engagementScore: Math.floor(Math.random() * 40) + 60,
            keyTopics: ['Product', 'Budget', 'Growth', 'Technical', 'Feedback'].slice(0, Math.floor(Math.random() * 3) + 1),
            actionItemsCount: Math.floor(Math.random() * 5),
            decisionsCount: Math.floor(Math.random() * 3),
          }
        });

        // Add some tasks for these meetings
        if (m.aiInsights.actionItemsCount > 0) {
          for (let k = 0; k < m.aiInsights.actionItemsCount; k++) {
            await Task.create({
              meetingId: m._id,
              userId: demoUser._id,
              title: `Action Item ${k+1} from Day ${30-i}`,
              status: Math.random() > 0.5 ? 'completed' : 'pending',
              priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
              dueDate: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000),
              completedAt: Math.random() > 0.5 ? new Date() : null,
              createdAt: date
            });
          }
        }
      }
    }

    // 1. Specific Sample: Q3 Sprint Planning
    const m1 = await createFullMeeting(
      {
        title: 'Q3 Sprint Planning', category: 'planning', platform: 'zoom', duration: 3240,
        recording: { fileUrl: 'https://vjs.zencdn.net/v/oceans.mp4', isProcessed: true }
      },
      "We need to finalize the Q3 roadmap. Sarah is working on auth, John on dashboard. We need to implement 2FA by next week. The dashboard needs real-time charts.",
      {
        brief: 'Planning for Q3 sprint and task allocation.',
        chapters: [
          { title: 'Intro & Roadmap Overview', startTime: 0, endTime: 300, summary: 'Setting the stage for Q3 goals.' },
          { title: 'Authentication & 2FA', startTime: 301, endTime: 900, summary: 'Discussing security requirements.' },
          { title: 'Dashboard Real-time Integration', startTime: 901, endTime: 1800, summary: 'Technical details for charts.' }
        ],
        keyTopics: [{ topic: 'Roadmap', relevance: 0.9 }]
      }
    );

    // 2. Marketing Strategy
    const m2 = await createFullMeeting(
      { title: 'Marketing Strategy Workshop', category: 'other', platform: 'google_meet', duration: 1800,
        recording: { fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', isProcessed: true } },
      "Our Q4 strategy involves social media and PPC. We should focus on LinkedIn video content.",
      {
        brief: 'Reviewing Q4 marketing channels.',
        chapters: [
          { title: 'Q3 Review', startTime: 0, endTime: 400 },
          { title: 'LinkedIn Video Strategy', startTime: 401, endTime: 1200 }
        ]
      }
    );

    // 3. Client Review
    const m3 = await createFullMeeting(
      { title: 'Client Review - Acme Corp', category: 'client', platform: 'microsoft_teams', duration: 2400,
        recording: { fileUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4', isProcessed: true } },
      "Acme is happy with the progress. They want to see the roadmap for next quarter. Budget is approved.",
      {
        brief: 'Monthly sync with Acme Corp.',
        chapters: [
          { title: 'Project Status', startTime: 0, endTime: 600 },
          { title: 'Budget Approval', startTime: 601, endTime: 1500 }
        ]
      }
    );

    // 4. Product Demo
    const m4 = await createFullMeeting(
      { title: 'Product Demo - New Analytics', category: 'review', platform: 'zoom', duration: 1200,
        recording: { fileUrl: 'https://www.w3schools.com/html/movie.mp4', isProcessed: true } },
      "Showing the new analytics engine. Export functionality is now live.",
      { brief: 'Demo of the new analytics dashboard.' }
    );

    // 5. Weekly Sync
    const m5 = await createFullMeeting(
      { title: 'Weekly Sync - Engineering', category: 'standup', platform: 'google_meet', duration: 900,
        recording: { fileUrl: 'https://vjs.zencdn.net/v/oceans.mp4', isProcessed: true } },
      "Weekly check-in. No major blockers. API tests are passing.",
      { brief: 'Regular engineering standup.' }
    );

    // 6. Investor Pitch
    const m6 = await createFullMeeting(
      { title: 'Investor Pitch Rehearsal', category: 'other', platform: 'manual_upload', duration: 3600,
        recording: { fileUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4', isProcessed: true } },
      "Series A pitch rehearsal. Focus on growth metrics and MRR.",
      { brief: 'Pitch practice for the upcoming funding round.' }
    );

    // Tasks
    await Task.create({ meetingId: m1._id, userId: demoUser._id, title: 'Implement 2FA for admin', priority: 'high', status: 'pending' });
    await Task.create({ meetingId: m2._id, userId: demoUser._id, title: 'Draft content calendar', priority: 'medium', status: 'in_progress' });
    await Task.create({ meetingId: m3._id, userId: demoUser._id, title: 'Send roadmap to Acme', priority: 'urgent', status: 'completed' });

    logger.info('✅ Seeded 6 advanced meetings with Chapters, AI Summaries, and Transcriptions!');
    process.exit(0);
  } catch (err) {
    logger.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
};

seed();
