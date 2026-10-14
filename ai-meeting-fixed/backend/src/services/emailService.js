const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this._init();
  }

  _init() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } catch (err) {
      logger.warn(`Email service init failed: ${err.message}`);
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.transporter || !process.env.SMTP_USER) {
      logger.warn('Email not configured, skipping send');
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'AI Meetings'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to, subject, html, text,
      });
      logger.info(`Email sent to ${to}`);
      return true;
    } catch (err) {
      logger.error(`Email send failed: ${err.message}`);
      throw err;
    }
  }

  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: '🎉 Welcome to AI Meeting Intelligence!',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h1 style="color:#6366f1">Welcome, ${user.firstName}!</h1>
        <p>Your account is ready. Start by uploading your first meeting recording.</p>
        <a href="${process.env.CLIENT_URL}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Go to Dashboard</a>
      </div>`,
    });
  }

  async sendMeetingReadyEmail(user, meeting, tasksCount) {
    return this.sendEmail({
      to: user.email,
      subject: `✅ Meeting Ready: ${meeting.title}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#6366f1">Your meeting is ready!</h2>
        <h3>${meeting.title}</h3>
        <p>We've processed your recording and extracted <strong>${tasksCount} action items</strong>.</p>
        <a href="${process.env.CLIENT_URL}/meetings/${meeting._id}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View Meeting</a>
      </div>`,
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    return this.sendEmail({
      to: user.email,
      subject: '🔐 Password Reset Request',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2>Reset Your Password</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px">If you didn't request this, ignore this email.</p>
      </div>`,
    });
  }

  async sendTaskReminderEmail(user, task, meeting) {
    return this.sendEmail({
      to: user.email,
      subject: `⏰ Task Due Soon: ${task.title}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2>Task Reminder</h2>
        <p><strong>${task.title}</strong></p>
        <p>From meeting: ${meeting.title}</p>
        <p>Due: ${new Date(task.dueDate).toLocaleDateString()}</p>
        <a href="${process.env.CLIENT_URL}/tasks/${task._id}" style="background:#f59e0b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">View Task</a>
      </div>`,
    });
  }
}

module.exports = new EmailService();
