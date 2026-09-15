import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getHealth,
  chatWithAI,
  getRecommendations,
  generateProductDescription,
  searchProductsAI,
  getSupportSuggestion,
  generateDietPlan,
  getDietPlans,
  getDietPlanById,
  deleteDietPlan,
  chatDietPlanFollowUp
} from './aiController.js';
import { protect, admin, authorize, optionalProtect } from '../middleware/authMiddleware.js';
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

// === AI DIET PLANNER ROUTES ===
// POST /api/ai/diet-plan (Generate and save diet plan)
router.post('/diet-plan', aiLimiter, protect, authorize('student'), generateDietPlan);

// GET /api/ai/diet-plan (List saved diet plans for student)
router.get('/diet-plan', aiLimiter, protect, authorize('student'), getDietPlans);

// GET /api/ai/diet-plan/:id (Get single diet plan by ID)
router.get('/diet-plan/:id', aiLimiter, protect, authorize('student'), getDietPlanById);

// DELETE /api/ai/diet-plan/:id (Delete saved diet plan)
router.delete('/diet-plan/:id', aiLimiter, protect, authorize('student'), deleteDietPlan);

// POST /api/ai/diet-plan/chat (Diet follow-up Q&A and smart substitutions)
router.post('/diet-plan/chat', aiLimiter, protect, authorize('student'), chatDietPlanFollowUp);

export default router;
