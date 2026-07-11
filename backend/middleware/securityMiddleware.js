import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// 1. NoSQL Injection Sanitizer
// Recursively removes keys starting with '$' or containing '.' from req.body, req.query, and req.params
const cleanNoSQL = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        cleanNoSQL(obj[key]);
      }
    }
  }
};

export const nosqlSanitize = (req, res, next) => {
  cleanNoSQL(req.body);
  cleanNoSQL(req.query);
  cleanNoSQL(req.params);
  next();
};

// 2. XSS Input Sanitizer
// Escapes HTML characters in request body, query, and params to prevent script injections,
// while preserving legitimate URLs (e.g. Unsplash, media uploads)
const escapeString = (str) => {
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/uploads/')) {
    return str;
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    return escapeString(val);
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val && typeof val === 'object') {
    for (const key in val) {
      val[key] = sanitizeValue(val[key]);
    }
  }
  return val;
};

export const xssSanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

const rateLimitHandler = (limitType) => (req, res, next, options) => {
  logger.warn('RATE_LIMIT_EXCEEDED', `Rate limit exceeded (${limitType}) for IP ${req.ip} on ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    limitType,
  });
  res.status(options.statusCode).json(options.message);
};

// 3. Search Rate Limiter (100 queries per 15 minutes)
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many search requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('SEARCH'),
});

// 4. Custom Request Rate Limiter (10 requests per 15 minutes)
export const customRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many custom requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('CUSTOM_REQUEST'),
});

// 5. Checkout Rate Limiter (5 checkouts per 15 minutes)
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many checkout attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('CHECKOUT'),
});

// 6. Upload Rate Limiter (10 uploads per 15 minutes)
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many upload attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('UPLOAD'),
});

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => {
    const parts = c.split('=');
    return [parts[0].trim(), parts.slice(1).join('=')];
  });
  const match = cookies.find(c => c[0] === name);
  return match ? decodeURIComponent(match[1]) : null;
};

// 7. Double-Submit Cookie CSRF Protection
export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfCookie = getCookieValue(req.headers.cookie, 'csrfToken');
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    logger.warn('CSRF_VALIDATION_FAILED', `CSRF mismatch for ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(403);
    throw new Error('CSRF token validation failed');
  }

  next();
};

// 8. Generate and Set CSRF Cookie
export const setCsrfCookie = (res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', token, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000, // 1 hour
  });
  return token;
};
