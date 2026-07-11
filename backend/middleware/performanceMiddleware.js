import { logger } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';
import { triggerAlert } from '../utils/alertService.js';

const slowRequestTimestamps = [];

export const requestDuration = (req, res, next) => {
  const start = process.hrtime();
  metrics.activeRequests++;
  metrics.totalRequests++;
  metrics.requestTimestamps.push(Date.now());

  res.on('finish', () => {
    metrics.activeRequests--;
    const diff = process.hrtime(start);
    const durationMs = Number((diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2));

    metrics.totalResponseTime += durationMs;
    if (durationMs > metrics.longestRequest) {
      metrics.longestRequest = durationMs;
    }

    if (res.statusCode >= 400) {
      metrics.errorCount++;
    } else {
      metrics.successCount++;
    }

    if (durationMs > 500) {
      metrics.slowRequests++;
      
      logger.performance('SLOW_REQUEST', `${req.method} ${req.originalUrl} took ${durationMs}ms`, {
        method: req.method,
        url: req.originalUrl,
        durationMs,
        status: res.statusCode,
      });

      const now = Date.now();
      slowRequestTimestamps.push(now);
      
      // Filter out timestamps older than 60 seconds
      while (slowRequestTimestamps.length > 0 && now - slowRequestTimestamps[0] > 60000) {
        slowRequestTimestamps.shift();
      }

      if (slowRequestTimestamps.length >= 5) {
        triggerAlert('warn', 'SLOW_REQUESTS_SPIKE', `Slow request spike detected: ${slowRequestTimestamps.length} slow requests in the last 60 seconds`, {
          activeSlowCount: slowRequestTimestamps.length,
        });
      }
    }
  });

  next();
};
