const jwt = require('jsonwebtoken');
const logger = require('./logger');

const socketHandler = (io) => {
  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);
    socket.join(`user:${socket.userId}`);

    socket.on('join:meeting', (meetingId) => {
      socket.join(`meeting:${meetingId}`);
      logger.debug(`Socket ${socket.id} joined meeting room: ${meetingId}`);
    });

    socket.on('leave:meeting', (meetingId) => {
      socket.leave(`meeting:${meetingId}`);
    });

    socket.on('join:team', (teamId) => {
      socket.join(`team:${teamId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  // Helper to emit processing updates
  io.emitProcessingUpdate = (meetingId, data) => {
    io.to(`meeting:${meetingId}`).emit('processing:update', { meetingId, ...data });
  };

  io.emitNotification = (userId, notification) => {
    io.to(`user:${userId}`).emit('notification:new', notification);
  };

  io.emitMeetingReady = (userId, meetingId) => {
    io.to(`user:${userId}`).emit('meeting:ready', { meetingId });
  };

  return io;
};

module.exports = socketHandler;
