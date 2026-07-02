import { logger } from '../utils/logger.js';
import { captureException } from '../utils/sentry.js';

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle Mongoose cast error (e.g. invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Resource not found';
  }

  // Log to structured logger
  logger.error('API_ERROR', message, {
    url: req.originalUrl,
    method: req.method,
    status: statusCode,
    ip: req.ip,
    stack: err.stack,
  });

  // Capture exception in Sentry dynamically
  captureException(err, {
    tags: {
      url: req.originalUrl,
      method: req.method,
      status: statusCode.toString(),
    },
  });

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };
