import * as Sentry from '@sentry/node';

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] SENTRY_DSN environment variable not found. Sentry is disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });

  console.log('[Sentry] Backend Sentry successfully initialized.');
};

export const captureException = (error, context = {}) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, context);
  }
};
