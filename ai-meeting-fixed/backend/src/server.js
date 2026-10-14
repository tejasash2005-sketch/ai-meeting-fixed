const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const socketHandler = require('./utils/socketHandler');

// Routes
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const transcriptionRoutes = require('./routes/transcriptions');
const summaryRoutes = require('./routes/summaries');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const liveRoomRoutes = require('./routes/liveRooms');
const notificationRoutes = require('./routes/notifications');
const teamRoutes = require('./routes/teams');
const analyticsRoutes = require('./routes/analytics');
const searchRoutes = require('./routes/search');
const calendarRoutes = require('./routes/calendar');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

/* =======================
   MIDDLEWARE
======================= */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use('/api/', rateLimiter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* =======================
   ROUTES
======================= */
app.get('/health', (req, res) =>
  res.json({ success: true, message: 'Server running' })
);

app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/live', liveRoomRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/calendar', calendarRoutes);

app.use('*', (req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

app.use(errorHandler);

/* =======================
   SOCKET
======================= */
socketHandler(io);

/* =======================
   START SERVER (FIXED)
======================= */
const startServer = async () => {
  try {
    await connectDB();      // 🔥 WAIT for MongoDB
    await connectRedis();   // optional

    server.listen(process.env.PORT || 5000, () => {
      logger.info(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });

  } catch (err) {
    logger.error(`Startup error: ${err.message}`);
    process.exit(1);
  }
};

startServer();

/* =======================
   ERROR HANDLING
======================= */
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});