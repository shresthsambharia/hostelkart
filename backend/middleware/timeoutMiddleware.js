import { logger } from '../utils/logger.js';

export const requestTimeout = (limitMs = 15000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('API_TIMEOUT', `Request timed out after ${limitMs}ms`, {
          url: req.originalUrl,
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
