import rateLimit from 'express-rate-limit';

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

// 3. Search Rate Limiter (100 queries per 15 minutes)
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many search requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. Custom Request Rate Limiter (10 requests per 15 minutes)
export const customRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many custom requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
