const logger = require('../utils/logger');
const aiService = require('./aiService');
const Meeting = require('../models/Meeting');
const Transcription = require('../models/Transcription');
const Summary = require('../models/Summary');
const Task = require('../models/Task');
const { Notification } = require('../models/Team');
const emailService = require('./emailService');

class ProcessingService {
  // Main pipeline: transcribe -> summarize -> extract tasks
  async processMeeting(meetingId, userId, io = null) {
    const emit = (stage, progress, data = {}) => {
      if (io) io.to(`user_${userId}`).emit('processing_update', { meetingId, stage, progress, ...data });
    };

    try {
      const meeting = await Meeting.findById(meetingId).populate('host', 'firstName lastName email preferences');
      if (!meeting) throw new Error('Meeting not found');

      // Stage 1: Start
      await Meeting.findByIdAndUpdate(meetingId, { status: 'processing', processingStage: 'transcribing', processingProgress: 5 });
      emit('transcribing', 5, { message: 'Starting transcription...' });

      // Stage 2: Transcription
      logger.info(`[Pipeline] Starting transcription for meeting ${meetingId}`);
      const filePath = meeting.recording?.fileUrl
        ? require('path').join(__dirname, '../../', meeting.recording.fileUrl)
        : null;

      if (!filePath) throw new Error('No recording file found for this meeting');

      const transcriptionData = await aiService.transcribeAudio(filePath, meeting.language || 'en');
      emit('transcribing', 40, { message: 'Transcription complete' });

      // Save transcription
      const transcription = await Transcription.findOneAndUpdate(
        { meetingId },
        {
          meetingId, userId,
          rawText: transcriptionData.rawText,
          formattedText: transcriptionData.formattedText,
          segments: transcriptionData.segments,
          speakers: transcriptionData.speakers,
          language: transcriptionData.language,
          confidence: transcriptionData.confidence,
          wordCount: transcriptionData.wordCount,
          processingTime: transcriptionData.processingTime,
          engine: transcriptionData.engine,
          whisperModel: transcriptionData.whisperModel,
          status: 'completed',
        },
        { upsert: true, new: true }
      );

      await Meeting.findByIdAndUpdate(meetingId, { processingStage: 'summarizing', processingProgress: 45 });
      emit('summarizing', 45, { message: 'Generating AI summary...' });

      // Stage 3: Summarization
      logger.info(`[Pipeline] Generating summary for meeting ${meetingId}`);
      const participants = meeting.participants.map(p => p.name || p.email || 'Unknown');
      const summaryData = await aiService.generateSummary(transcriptionData.rawText, {
        title: meeting.title,
        date: meeting.scheduledAt || meeting.createdAt,
        duration: Math.floor((meeting.duration || 0) / 60),
        participants,
      });

      const summary = await Summary.findOneAndUpdate(
        { meetingId },
        { meetingId, userId, ...summaryData, status: 'completed' },
        { upsert: true, new: true }
      );

      await Meeting.findByIdAndUpdate(meetingId, { processingStage: 'extracting_tasks', processingProgress: 75 });
      emit('extracting_tasks', 75, { message: 'Extracting tasks and deadlines...' });

      // Stage 4: Task Extraction
      logger.info(`[Pipeline] Extracting tasks for meeting ${meetingId}`);
      const taskData = await aiService.extractTasks(transcriptionData.rawText, {
        title: meeting.title,
        participants,
        date: meeting.scheduledAt || meeting.createdAt,
      });

      // Save tasks
      const savedTasks = [];
      for (const task of taskData.tasks) {
        const newTask = await Task.create({
          meetingId,
          userId,
          teamId: meeting.teamId,
          title: task.title,
          description: task.description,
          assignedTo: task.assignedTo,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          dueDateConfidence: task.dueDateConfidence,
          priority: task.priority,
          category: task.category,
          transcriptReference: task.transcriptReference,
          aiExtracted: true,
          aiConfidence: task.aiConfidence,
        });
        savedTasks.push(newTask);
      }

      emit('extracting_tasks', 90, { message: `Found ${savedTasks.length} tasks` });

      // Stage 5: Finalize
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'completed',
        processingStage: 'done',
        processingProgress: 100,
        'aiInsights.sentiment': summaryData.sentiment,
        'aiInsights.engagementScore': summaryData.engagementScore,
        'aiInsights.keyTopics': summaryData.keyTopics?.map(t => t.topic) || [],
        'aiInsights.actionItemsCount': savedTasks.length,
        'aiInsights.decisionsCount': summaryData.keyDecisions?.length || 0,
      });

      emit('done', 100, {
        message: 'Processing complete!',
        tasksCount: savedTasks.length,
        transcriptionId: transcription._id,
        summaryId: summary._id,
      });

      // Notify user
      await Notification.create({
        userId,
        type: 'meeting_processed',
        title: 'Meeting Ready',
        message: `"${meeting.title}" has been processed. ${savedTasks.length} tasks extracted.`,
        data: { meetingId, tasksCount: savedTasks.length },
        link: `/meetings/${meetingId}`,
      });

      // Email notification
      if (meeting.host?.preferences?.emailNotifications) {
        await emailService.sendMeetingProcessedEmail(meeting.host, meeting, {
          tasksCount: savedTasks.length,
          summary: summaryData.brief,
        });
      }

      logger.info(`[Pipeline] ✅ Meeting ${meetingId} fully processed. Tasks: ${savedTasks.length}`);
      return { success: true, transcriptionId: transcription._id, summaryId: summary._id, tasksCount: savedTasks.length };

    } catch (error) {
      logger.error(`[Pipeline] ❌ Failed for meeting ${meetingId}: ${error.message}`);
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'failed',
        errorMessage: error.message,
        processingProgress: 0,
      });
      emit('failed', 0, { message: error.message });
      throw error;
    }
  }
}

module.exports = new ProcessingService();
