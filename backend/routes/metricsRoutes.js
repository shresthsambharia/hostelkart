import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { metrics, getRequestsPerMinute, getCpuUsage } from '../utils/metrics.js';
import { getCacheMetrics } from '../middleware/cacheMiddleware.js';
import os from 'os';

const router = express.Router();

router.get('/', protect, admin, (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.json({
    requestsPerMinute: getRequestsPerMinute(),
    averageResponseTime: metrics.totalRequests > 0 
      ? Number((metrics.totalResponseTime / metrics.totalRequests).toFixed(2)) 
      : 0,
    slowRequests: metrics.slowRequests,
    errorCount: metrics.errorCount,
    successCount: metrics.successCount,
    activeRequests: metrics.activeRequests,
    totalRequestsServed: metrics.totalRequests,
    longestRequest: metrics.longestRequest,
    cache: getCacheMetrics(),
    memoryUsage: {
      heapUsed: Number((memoryUsage.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotal: Number((memoryUsage.heapTotal / 1024 / 1024).toFixed(2)),
      rss: Number((memoryUsage.rss / 1024 / 1024).toFixed(2)),
    },
    cpuUsage: getCpuUsage(),
    system: {
      uptime: process.uptime(),
      freeMem: Number((os.freemem() / 1024 / 1024).toFixed(2)),
      totalMem: Number((os.totalmem() / 1024 / 1024).toFixed(2)),
    }
  });
});

export default router;
