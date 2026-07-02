// Recursively redacts sensitive fields from logger metadata object
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

const logMessage = (level, event, message, meta = {}) => {
  const sanitizedMeta = redactSensitiveData(meta);

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    meta: sanitizedMeta,
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const metaStr = Object.keys(sanitizedMeta).length ? ` | Meta: ${JSON.stringify(sanitizedMeta)}` : '';
    console.log(`[${logEntry.timestamp}] [${level.toUpperCase()}] [${event}]: ${message}${metaStr}`);
  }
};

export const logger = {
  info: (event, message, meta) => logMessage('info', event, message, meta),
  warn: (event, message, meta) => logMessage('warn', event, message, meta),
  error: (event, message, meta) => logMessage('error', event, message, meta),
  security: (event, message, meta) => logMessage('security', event, message, meta),
};
