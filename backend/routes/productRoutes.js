import express from 'express';
import {
  getProducts,
  getProductById,
  createProductReview,
  getCategories,
  getSearchSuggestions,
  getTrendingSearches,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { searchLimiter } from '../middleware/securityMiddleware.js';
import { cache } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.get('/', cache(300), getProducts);
router.get('/categories', cache(3600), getCategories);
router.get('/search/suggest', searchLimiter, cache(300), getSearchSuggestions);
router.get('/search/trending', searchLimiter, cache(300), getTrendingSearches);
router.get('/:id', cache(300), getProductById);
router.post('/:id/reviews', protect, authorize('student'), createProductReview);

export default router;
