const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AIService {
  // Module 3: Whisper Transcription
  async transcribeAudio(filePath, language = 'en', options = {}) {
    const startTime = Date.now();
    try {
      logger.info(`Starting transcription for: ${filePath}`);
      
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key') {
        return this._getMockTranscription(filePath);
      }

      const fileStream = fs.createReadStream(filePath);
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language: language !== 'auto' ? language : undefined,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment', 'word'],
      });

      const processingTime = Date.now() - startTime;
      logger.info(`Transcription completed in ${processingTime}ms`);

      return {
        rawText: transcription.text,
        formattedText: this._formatTranscript(transcription.segments || []),
        segments: (transcription.segments || []).map((seg, i) => ({
          id: i,
          start: seg.start,
          end: seg.end,
          text: seg.text.trim(),
          speaker: `SPEAKER_${String(i % 3).padStart(2, '0')}`,
          confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.9,
          words: seg.words || [],
        })),
        language: transcription.language || language,
        confidence: 0.95,
        wordCount: transcription.text.split(' ').length,
        processingTime,
        engine: 'whisper',
        whisperModel: 'whisper-1',
      };
    } catch (error) {
      logger.error(`Transcription error: ${error.message}`);
      if (error.status === 429) throw new Error('OpenAI rate limit exceeded. Please try again later.');
      if (error.status === 401) throw new Error('Invalid OpenAI API key.');
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  // Module 4: GPT Summarization
  async generateSummary(transcriptText, meetingMetadata = {}) {
    const startTime = Date.now();
    try {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key') {
        return this._getMockSummary(transcriptText, meetingMetadata);
      }

      const prompt = this._buildSummaryPrompt(transcriptText, meetingMetadata);
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert meeting analyst. Analyze meeting transcripts and provide structured, actionable summaries. Always respond with valid JSON matching the exact schema requested.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const processingTime = Date.now() - startTime;

      return {
        ...result,
        processingTime,
        model: 'gpt-4',
        status: 'completed',
      };
    } catch (error) {
      logger.error(`Summarization error: ${error.message}`);
      throw new Error(`Summarization failed: ${error.message}`);
    }
  }

  // Module 5: Task Extraction
  async extractTasks(transcriptText, meetingMetadata = {}) {
    const startTime = Date.now();
    try {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key') {
        return this._getMockTasks(transcriptText, meetingMetadata);
      }

      const prompt = this._buildTaskExtractionPrompt(transcriptText, meetingMetadata);
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting action items, tasks, and deadlines from meeting transcripts. Be precise about who is responsible and when things are due. Always return valid JSON.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const processingTime = Date.now() - startTime;
      logger.info(`Extracted ${result.tasks?.length || 0} tasks in ${processingTime}ms`);
      return { tasks: result.tasks || [], processingTime };
    } catch (error) {
      logger.error(`Task extraction error: ${error.message}`);
      throw new Error(`Task extraction failed: ${error.message}`);
    }
  }

  _buildSummaryPrompt(transcript, metadata) {
    return `Analyze this meeting transcript and return a JSON object with EXACTLY this structure:
{
  "brief": "2-3 sentence overview",
  "detailed": "Comprehensive paragraph summary",
  "bulletPoints": ["key point 1", "key point 2", ...],
  "keyDecisions": [{"decision": "...", "madeBy": "name or Unknown", "context": "..."}],
  "keyDiscussionPoints": [{"topic": "...", "summary": "...", "participants": []}],
  "followUps": ["follow up 1", ...],
  "nextSteps": ["next step 1", ...],
  "openQuestions": ["question 1", ...],
  "risks": ["risk 1", ...],
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.0,
  "engagementScore": 75,
  "keyTopics": [{"topic": "...", "frequency": 5, "relevance": 0.9}],
  "meetingType": "standup|planning|review|client|brainstorm|other"
}

Meeting: ${metadata.title || 'Untitled'}
Date: ${metadata.date || 'Unknown'}
Duration: ${metadata.duration || 'Unknown'} minutes
Participants: ${metadata.participants?.join(', ') || 'Unknown'}

TRANSCRIPT:
${transcript.substring(0, 8000)}`;
  }

  _buildTaskExtractionPrompt(transcript, metadata) {
    const today = new Date().toISOString().split('T')[0];
    return `Extract ALL action items and tasks from this meeting transcript. Return JSON:
{
  "tasks": [
    {
      "title": "clear actionable task",
      "description": "additional context",
      "assignedTo": {"name": "person name or null", "email": null},
      "dueDate": "ISO date string or null",
      "dueDateConfidence": 0.9,
      "priority": "low|medium|high|urgent",
      "category": "action_item|follow_up|decision|blocker|research|other",
      "aiConfidence": 0.95,
      "transcriptReference": {"text": "exact quote from transcript", "speaker": "name"}
    }
  ]
}

Today's date: ${today}
Meeting: ${metadata.title || 'Untitled'}
Participants: ${metadata.participants?.join(', ') || 'Unknown'}

IMPORTANT: Extract only explicit commitments, not vague suggestions. Include dates mentioned like "by Friday", "next week", "end of month".

TRANSCRIPT:
${transcript.substring(0, 6000)}`;
  }

  _formatTranscript(segments) {
    if (!segments?.length) return '';
    return segments.map(seg => {
      const time = this._formatTime(seg.start);
      return `[${time}] ${seg.text.trim()}`;
    }).join('\n');
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  _getMockTranscription(filePath) {
    const fileName = path.basename(filePath);
    return {
      rawText: `Good morning everyone, let's get started with today's sprint planning. Sarah, can you give us the status update on the authentication module? Sure, the authentication module is about 80% complete. We've finished the login and registration flows, but we still need to implement the password reset functionality and two-factor authentication. I'm planning to have those done by Thursday. Great. John, what about the dashboard? The dashboard is on track. I've completed the main layout and the analytics widgets. I need to integrate the real-time data feeds, which should take about two more days. I'll have a demo ready for the client meeting on Friday. Perfect. We also need to discuss the API rate limiting issue that came up yesterday. Mike, you mentioned there was a concern about the third-party integration? Yes, the payment gateway has a rate limit of 100 requests per minute, and our current implementation might exceed that during peak hours. I'll need to implement a queue system. Can you have a proposal ready by Wednesday? Yes, I'll have the technical proposal ready by Wednesday noon. Also, don't forget we have the investor presentation next Tuesday. Everyone should review the deck by Monday and send their feedback to Lisa. The meeting will be at 2 PM in the main conference room. Any other blockers? I think we're good. Let's reconvene Thursday for the sprint review.`,
      formattedText: `[00:00] Good morning everyone, let's get started with today's sprint planning.\n[00:05] Sarah: The authentication module is about 80% complete.\n[00:15] John: The dashboard is on track, demo ready for client meeting Friday.\n[00:25] Mike: Payment gateway rate limiting issue needs a queue system.\n[00:35] Action: Technical proposal due Wednesday noon.\n[00:45] Investor presentation next Tuesday at 2 PM.`,
      segments: [
        { id: 0, start: 0, end: 5, text: "Good morning everyone, let's get started with today's sprint planning.", speaker: 'SPEAKER_00', confidence: 0.98 },
        { id: 1, start: 5, end: 20, text: 'The authentication module is about 80% complete. Password reset and 2FA needed by Thursday.', speaker: 'SPEAKER_01', confidence: 0.97 },
        { id: 2, start: 20, end: 35, text: 'Dashboard on track. Real-time data feeds integration in 2 days. Demo ready for client Friday.', speaker: 'SPEAKER_02', confidence: 0.96 },
        { id: 3, start: 35, end: 55, text: 'Payment gateway rate limit issue. Need queue system proposal by Wednesday noon.', speaker: 'SPEAKER_03', confidence: 0.95 },
        { id: 4, start: 55, end: 70, text: 'Investor presentation Tuesday 2PM. Review deck by Monday, send feedback to Lisa.', speaker: 'SPEAKER_00', confidence: 0.97 },
      ],
      speakers: [
        { label: 'SPEAKER_00', name: 'Facilitator', speakingTime: 120, wordCount: 250, turnCount: 8 },
        { label: 'SPEAKER_01', name: 'Sarah', speakingTime: 85, wordCount: 180, turnCount: 4 },
        { label: 'SPEAKER_02', name: 'John', speakingTime: 90, wordCount: 190, turnCount: 4 },
        { label: 'SPEAKER_03', name: 'Mike', speakingTime: 75, wordCount: 160, turnCount: 3 },
      ],
      language: 'en', confidence: 0.97, wordCount: 320, processingTime: 2500, engine: 'mock', whisperModel: 'mock',
    };
  }

  _getMockSummary(transcript, metadata) {
    return {
      brief: 'Sprint planning meeting covering authentication module progress, dashboard development, and API rate limiting concerns. Team aligned on deliverables for upcoming client meeting and investor presentation.',
      detailed: 'The team held a productive sprint planning session. Sarah reported the authentication module is 80% complete with password reset and 2FA remaining for Thursday delivery. John confirmed the dashboard is on track with a client demo scheduled for Friday. A critical API rate limiting issue was raised by Mike regarding the payment gateway, requiring a queue system implementation with a proposal due Wednesday. The meeting concluded with reminders about the investor presentation on Tuesday.',
      bulletPoints: ['Authentication module 80% complete; password reset & 2FA due Thursday', 'Dashboard on track; client demo Friday', 'Payment gateway rate limiting issue - queue system needed', 'Technical proposal for rate limiting due Wednesday noon', 'Investor presentation Tuesday 2PM - review deck by Monday'],
      keyDecisions: [{ decision: 'Implement queue system for payment gateway', madeBy: 'Team', context: 'Rate limit concern raised' }],
      keyDiscussionPoints: [{ topic: 'Sprint Status Updates', summary: 'Auth 80%, Dashboard on track', participants: ['Sarah', 'John'] }, { topic: 'API Rate Limiting', summary: 'Payment gateway 100 req/min limit', participants: ['Mike'] }],
      followUps: ['Mike to send technical proposal by Wednesday noon', 'Everyone review investor deck by Monday', 'Send feedback to Lisa'],
      nextSteps: ['Complete password reset + 2FA (Sarah, Thu)', 'Finish real-time data feeds (John, Wed)', 'Queue system proposal (Mike, Wed noon)', 'Sprint review Thursday'],
      openQuestions: ['Will queue system be ready before peak hours start?'],
      risks: ['Payment gateway rate limit could affect peak-hour transactions'],
      sentiment: 'positive', sentimentScore: 0.65, engagementScore: 82,
      keyTopics: [{ topic: 'Authentication', frequency: 5, relevance: 0.9 }, { topic: 'Dashboard', frequency: 4, relevance: 0.8 }, { topic: 'Rate Limiting', frequency: 6, relevance: 0.85 }],
      meetingType: 'planning', processingTime: 1800, model: 'mock', status: 'completed',
    };
  }

  _getMockTasks(transcript, metadata) {
    const today = new Date();
    const thursday = new Date(today); thursday.setDate(today.getDate() + 3);
    const wednesday = new Date(today); wednesday.setDate(today.getDate() + 2);
    const monday = new Date(today); monday.setDate(today.getDate() + 6);
    
    return {
      tasks: [
        { title: 'Complete password reset and two-factor authentication', description: 'Finish remaining auth module features', assignedTo: { name: 'Sarah', email: null }, dueDate: thursday.toISOString(), dueDateConfidence: 0.95, priority: 'high', category: 'action_item', aiConfidence: 0.95, transcriptReference: { text: "I'm planning to have those done by Thursday", speaker: 'Sarah' } },
        { title: 'Integrate real-time data feeds into dashboard', description: 'Connect live data to dashboard widgets', assignedTo: { name: 'John', email: null }, dueDate: wednesday.toISOString(), dueDateConfidence: 0.8, priority: 'high', category: 'action_item', aiConfidence: 0.92, transcriptReference: { text: 'should take about two more days', speaker: 'John' } },
        { title: 'Prepare technical proposal for API rate limiting queue system', description: 'Address payment gateway 100 req/min limit with queue architecture', assignedTo: { name: 'Mike', email: null }, dueDate: wednesday.toISOString(), dueDateConfidence: 0.98, priority: 'urgent', category: 'action_item', aiConfidence: 0.97, transcriptReference: { text: "I'll have the technical proposal ready by Wednesday noon", speaker: 'Mike' } },
        { title: 'Review investor presentation deck', description: 'Review deck before investor presentation', assignedTo: { name: null, email: null }, dueDate: monday.toISOString(), dueDateConfidence: 0.9, priority: 'medium', category: 'follow_up', aiConfidence: 0.88, transcriptReference: { text: 'Everyone should review the deck by Monday and send their feedback to Lisa', speaker: 'Facilitator' } },
        { title: 'Prepare client meeting dashboard demo', description: 'Dashboard demo for Friday client meeting', assignedTo: { name: 'John', email: null }, dueDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(), dueDateConfidence: 0.93, priority: 'high', category: 'action_item', aiConfidence: 0.94, transcriptReference: { text: "I'll have a demo ready for the client meeting on Friday", speaker: 'John' } },
      ],
      processingTime: 1200,
    };
  }
}

module.exports = new AIService();
