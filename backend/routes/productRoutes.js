import express from 'express';
import {
  getProducts,
  getProductById,
  createProductReview,
  getCategories,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);
router.post('/:id/reviews', protect, authorize('student'), createProductReview);

export default router;
