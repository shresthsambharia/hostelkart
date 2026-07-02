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

const router = express.Router();

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/search/suggest', searchLimiter, getSearchSuggestions);
router.get('/search/trending', searchLimiter, getTrendingSearches);
router.get('/:id', getProductById);
router.post('/:id/reviews', protect, authorize('student'), createProductReview);

export default router;
