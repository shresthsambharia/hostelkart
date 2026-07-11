import crypto from 'crypto';
import { asyncLocalStorage } from '../utils/asyncLocalStorage.js';

export const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  asyncLocalStorage.run({ requestId, userId: null }, () => {
    next();
  });
};
