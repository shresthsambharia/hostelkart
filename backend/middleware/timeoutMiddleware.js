import { logger } from '../utils/logger.js';

export const requestTimeout = (defaultLimitMs = 15000, routeOverrides = {}) => {
  return (req, res, next) => {
    let limitMs = defaultLimitMs;
    const path = req.originalUrl ? req.originalUrl.split('?')[0] : (req.path || req.url || '');

    for (const [routePrefix, customLimit] of Object.entries(routeOverrides)) {
      if (path === routePrefix || path.startsWith(routePrefix)) {
        limitMs = customLimit;
        break;
      }
    }

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('API_TIMEOUT', `Request timed out after ${limitMs}ms`, {
          url: req.originalUrl || req.url,
          method: req.method,
          ip: req.ip,
        });
        res.status(504).json({ message: 'Gateway Timeout: Request took too long to respond' });
      }
    }, limitMs);

    const clearTimer = () => clearTimeout(timer);
    res.on('finish', clearTimer);
    res.on('close', clearTimer);

    next();
  };
};

