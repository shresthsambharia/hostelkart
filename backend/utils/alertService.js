import { logger } from './logger.js';

const alertProviders = [
  {
    name: 'WINSTON',
    send: (level, alertType, message, meta) => {
      logger.error('SYSTEM_ALERT', `[ALERT-${alertType}] [${level.toUpperCase()}] ${message}`, {
        alertLevel: level,
        alertType,
        ...meta,
      });
    }
  }
];

export const triggerAlert = (level, alertType, message, meta = {}) => {
  for (const provider of alertProviders) {
    try {
      provider.send(level, alertType, message, meta);
    } catch (err) {
      console.error(`Alert provider ${provider.name} failed:`, err);
    }
  }
};
