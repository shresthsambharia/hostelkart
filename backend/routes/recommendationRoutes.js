import express from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import { cache } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.get('/', cache(60), getRecommendations);

export default router;
