const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  // Redis is optional — if not available, queues run in-memory
  if (!process.env.REDIS_HOST || process.env.REDIS_HOST === 'localhost') {
    logger.warn('Redis not configured — running without queue support (upload processing will be synchronous)');
    return null;
  }
  try {
    const Redis = require('ioredis');
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis unavailable after 3 retries — continuing without Redis');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });
    redisClient.on('connect', () => logger.info('✅ Redis connected'));
    redisClient.on('error', (err) => logger.warn(`Redis warning: ${err.message}`));
    return redisClient;
  } catch (err) {
    logger.warn(`Redis init failed: ${err.message} — continuing without Redis`);
    return null;
  }
};

module.exports = connectRedis;
module.exports.getClient = () => redisClient;
