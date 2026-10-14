const { google } = require('googleapis');
const logger = require('../utils/logger');

class CalendarService {
  _getOAuth2Client(tokens) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    if (tokens) oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }

  getAuthUrl(userId) {
    const oauth2Client = this._getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
      state: userId,
    });
  }

  async getTokens(code) {
    const oauth2Client = this._getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  async getUpcomingMeetings(tokens, days = 7) {
    try {
      const oauth2Client = this._getOAuth2Client(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const now = new Date();
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      });
      return response.data.items || [];
    } catch (error) {
      logger.error(`Calendar fetch error: ${error.message}`);
      return [];
    }
  }

  async createTaskEvent(tokens, task) {
    try {
      const oauth2Client = this._getOAuth2Client(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const event = {
        summary: `[Task] ${task.title}`,
        description: task.description || '',
        start: { dateTime: task.dueDate, timeZone: 'UTC' },
        end: { dateTime: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'UTC' },
        reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 1440 }, { method: 'popup', minutes: 60 }] },
      };
      const response = await calendar.events.insert({ calendarId: 'primary', resource: event });
      return response.data;
    } catch (error) {
      logger.error(`Calendar event creation error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new CalendarService();
