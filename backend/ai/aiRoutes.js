import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getHealth,
  chatWithAI,
  getRecommendations,
  generateProductDescription,
  searchProductsAI,
  getSupportSuggestion
} from './aiController.js';
import { protect, admin, optionalProtect } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import { cache } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Define isolated rate limiting handler
const rateLimitHandler = (limitType) => (req, res, next, options) => {
  logger.warn('RATE_LIMIT_EXCEEDED', `Rate limit exceeded (${limitType}) for IP ${req.ip} on ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    limitType,
  });
  res.status(options.statusCode).json(options.message);
};

// AI rate limiter - 30 queries per 15 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many AI inquiries, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('AI_LIMITER')
});

// GET /api/ai/health
router.get('/health', getHealth);

// POST /api/ai/chat
router.post('/chat', aiLimiter, optionalProtect, chatWithAI);

// GET /api/ai/recommend (Cached for 60s)
router.get('/recommend', aiLimiter, optionalProtect, cache(60), getRecommendations);

// POST /api/ai/product-description
router.post('/product-description', aiLimiter, protect, admin, generateProductDescription);

// POST /api/ai/copywriter
router.post('/copywriter', aiLimiter, protect, admin, generateProductDescription);

// POST /api/ai/search
router.post('/search', aiLimiter, searchProductsAI);

// POST /api/ai/support
router.post('/support', aiLimiter, optionalProtect, getSupportSuggestion);

export default router;
