const path = require('path');
const fs = require('fs');
const Meeting = require('../models/Meeting');
const Transcription = require('../models/Transcription');
const Summary = require('../models/Summary');
const Task = require('../models/Task');
const aiService = require('./aiService');
const logger = require('../utils/logger');

class MeetingProcessingService {
  async processRecording(meetingId, filePath, options = {}) {
    const meeting = await Meeting.findById(meetingId).populate('host');
    if (!meeting) throw new Error('Meeting not found');

    try {
      // Stage 1: Transcription
      await this._updateStage(meetingId, 'transcribing', 10);
      const transcriptionData = await aiService.transcribeAudio(filePath, options.language || meeting.language || 'en');

      let transcription = await Transcription.findOne({ meetingId });
      if (!transcription) transcription = new Transcription({ meetingId, userId: meeting.host._id });
      Object.assign(transcription, { ...transcriptionData, status: 'completed' });
      await transcription.save();
      await this._updateStage(meetingId, 'transcribing', 40);

      // Stage 2: Summarization
      await this._updateStage(meetingId, 'summarizing', 50);
      const participantNames = meeting.participants.map(p => p.name || p.email).filter(Boolean);
      const summaryData = await aiService.generateSummary(transcriptionData.rawText, {
        title: meeting.title,
        date: meeting.scheduledAt || meeting.createdAt,
        duration: Math.round((meeting.duration || 0) / 60),
        participants: participantNames,
      });

      let summary = await Summary.findOne({ meetingId });
      if (!summary) summary = new Summary({ meetingId, userId: meeting.host._id });
      Object.assign(summary, { ...summaryData, status: 'completed' });
      await summary.save();
      await this._updateStage(meetingId, 'summarizing', 70);

      // Stage 3: Task Extraction
      await this._updateStage(meetingId, 'extracting_tasks', 75);
      const taskData = await aiService.extractTasks(transcriptionData.rawText, {
        title: meeting.title, participants: participantNames,
      });

      const taskDocs = (taskData.tasks || []).map(task => ({
        ...task, meetingId, userId: meeting.host._id, teamId: meeting.teamId, aiExtracted: true,
      }));
      if (taskDocs.length > 0) await Task.insertMany(taskDocs);

      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'completed', processingStage: 'done', processingProgress: 100,
        'recording.isProcessed': true,
        'aiInsights.sentiment': summaryData.sentiment || 'neutral',
        'aiInsights.engagementScore': summaryData.engagementScore || 0,
        'aiInsights.keyTopics': summaryData.keyTopics?.map(t => t.topic || t) || [],
        'aiInsights.actionItemsCount': taskDocs.length,
        'aiInsights.decisionsCount': summaryData.keyDecisions?.length || 0,
      });

      logger.info(`✅ Meeting ${meetingId} processed: ${taskDocs.length} tasks extracted`);

    } catch (error) {
      logger.error(`Processing failed for ${meetingId}: ${error.message}`);
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'failed', errorMessage: error.message, processingProgress: 0,
      });
      throw error;
    }
  }

  async _updateStage(meetingId, stage, progress) {
    await Meeting.findByIdAndUpdate(meetingId, { processingStage: stage, processingProgress: progress });
  }
}

module.exports = new MeetingProcessingService();
