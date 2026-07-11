import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { asyncLocalStorage } from './asyncLocalStorage.js';

const redactSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sensitiveKeys = ['password', 'token', 'refreshToken', 'secret', 'jwt', 'cashfree_secret_key', 'cfsk', 'pass', 'utr', 'fcmToken'];
  const redactedObj = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const isSensitive = sensitiveKeys.some((sk) => key.toLowerCase().includes(sk));
      if (isSensitive) {
        redactedObj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        redactedObj[key] = redactSensitiveData(obj[key]);
      } else {
        redactedObj[key] = obj[key];
      }
    }
  }

  return redactedObj;
};

// Formatter to build structured log format including Request Context
const buildFormat = (filterFn) => {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format((info) => {
      if (filterFn && !filterFn(info)) return false;
      return info;
    })(),
    winston.format.printf((info) => {
      const { timestamp, level, message, event, ...meta } = info;
      const store = asyncLocalStorage.getStore();
      
      const requestId = store?.requestId || meta.requestId || '';
      const userId = store?.userId || meta.userId || '';

      delete meta.requestId;
      delete meta.userId;
      delete meta.isSecurity;
      delete meta.isPerformance;

      const sanitizedMeta = redactSensitiveData(meta);

      return JSON.stringify({
        timestamp,
        level,
        event: event || 'GENERAL',
        message,
        requestId,
        userId,
        environment: process.env.NODE_ENV || 'development',
        meta: sanitizedMeta,
      });
    })
  );
};

// Custom console format for local development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, event, ...meta }) => {
    const store = asyncLocalStorage.getStore();
    const requestId = store?.requestId || meta.requestId ? ` [Req: ${store?.requestId || meta.requestId}]` : '';
    const userId = store?.userId || meta.userId ? ` [User: ${store?.userId || meta.userId}]` : '';

    delete meta.requestId;
    delete meta.userId;
    delete meta.isSecurity;
    delete meta.isPerformance;

    const sanitizedMeta = redactSensitiveData(meta);
    const metaStr = Object.keys(sanitizedMeta).length ? ` | Meta: ${JSON.stringify(sanitizedMeta)}` : '';
    const eventPrefix = event ? `[${event}] ` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${requestId}${userId} ${eventPrefix}${message}${metaStr}`;
  })
);

// Define filters for specialized log targets
const securityFilter = (info) => info.isSecurity === true;
const performanceFilter = (info) => info.isPerformance === true;
const errorFilter = (info) => info.level === 'error';
const combinedFilter = (info) => true;

// Daily Rotate configurations
const rotateOptions = (filename, filterFn, level = 'info') => ({
  filename: `logs/${filename}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level,
  format: buildFormat(filterFn),
});

const winstonLogger = winston.createLogger({
  level: 'info',
  transports: [
    new DailyRotateFile(rotateOptions('error', errorFilter, 'error')),
    new DailyRotateFile(rotateOptions('combined', combinedFilter, 'info')),
    new DailyRotateFile(rotateOptions('security', securityFilter, 'warn')),
    new DailyRotateFile(rotateOptions('performance', performanceFilter, 'warn')),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

export const logger = {
  info: (event, message, meta = {}) => {
    winstonLogger.info(message, { event, ...meta });
  },
  warn: (event, message, meta = {}) => {
    winstonLogger.warn(message, { event, ...meta });
  },
  error: (event, message, meta = {}) => {
    winstonLogger.error(message, { event, ...meta });
  },
  security: (event, message, meta = {}) => {
    winstonLogger.warn(`[SECURITY] ${message}`, { event, isSecurity: true, ...meta });
  },
  performance: (event, message, meta = {}) => {
    winstonLogger.warn(`[PERFORMANCE] ${message}`, { event, isPerformance: true, ...meta });
  },
};
