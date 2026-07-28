import express from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';
import { cache } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.get('/', optionalProtect, cache(60), getRecommendations);

export default router;
