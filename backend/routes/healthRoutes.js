import express from 'express';
import mongoose from 'mongoose';
import { metrics, getCpuUsage } from '../utils/metrics.js';
import { redisClient, isRedisAvailable } from '../config/redis.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  let dbStatusString = 'unknown';

  switch (dbStatus) {
    case 0:
      dbStatusString = 'disconnected';
      break;
    case 1:
      dbStatusString = 'connected';
      break;
    case 2:
      dbStatusString = 'connecting';
      break;
    case 3:
      dbStatusString = 'disconnecting';
      break;
  }

  // Measure database latency
  const dbStart = process.hrtime();
  let dbLatency = 0;
  if (dbStatus === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      const dbDiff = process.hrtime(dbStart);
      dbLatency = Number((dbDiff[0] * 1e3 + dbDiff[1] * 1e-6).toFixed(2));
    } catch (err) {
      // fail silently
    }
  }

  const cloudinaryConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  // Measure Redis latency and stats
  let redisStatus = 'disconnected';
  let redisLatency = 0;
  let redisMemory = '0B';
  let redisVersion = '0.0.0';

  if (isRedisAvailable && typeof redisClient.ping === 'function') {
    redisStatus = 'connected';
    try {
      const redisStart = process.hrtime();
      await redisClient.ping();
      const redisDiff = process.hrtime(redisStart);
      redisLatency = Number((redisDiff[0] * 1e3 + redisDiff[1] * 1e-6).toFixed(2));
      
      const info = await redisClient.info();
      const versionMatch = info.match(/redis_version:([^\s\r\n]+)/);
      if (versionMatch) redisVersion = versionMatch[1];
      
      const memoryMatch = info.match(/used_memory_human:([^\s\r\n]+)/);
      if (memoryMatch) redisMemory = memoryMatch[1];
    } catch (err) {
      redisStatus = 'error';
    }
  }

  const isHealthy = dbStatus === 1 && cloudinaryConfigured && (!process.env.REDIS_URL || redisStatus === 'connected');

  const memoryUsage = process.memoryUsage();

  const healthData = {
    server: {
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
    system: {
      memoryUsage: {
        heapUsed: Number((memoryUsage.heapUsed / 1024 / 1024).toFixed(2)),
        heapTotal: Number((memoryUsage.heapTotal / 1024 / 1024).toFixed(2)),
        rss: Number((memoryUsage.rss / 1024 / 1024).toFixed(2)),
      },
      cpuUsage: getCpuUsage(),
      nodeVersion: process.version,
    },
    database: {
      status: dbStatusString,
      connected: dbStatus === 1,
      connectionLatencyMs: dbLatency,
    },
    redis: {
      status: redisStatus,
      connected: redisStatus === 'connected',
      latencyMs: redisLatency,
      memory: redisMemory,
      version: redisVersion,
    },
    cloudinary: {
      configured: cloudinaryConfigured,
    },
    application: {
      activeRequests: metrics.activeRequests,
      totalRequests: metrics.totalRequests,
      averageResponseTimeMs: metrics.totalRequests > 0
        ? Number((metrics.totalResponseTime / metrics.totalRequests).toFixed(2))
        : 0,
    }
  };

  res.status(isHealthy ? 200 : 503).json(healthData);
});

export default router;
