import express from 'express';
import {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} from '../controllers/cartController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('student'));

router
  .route('/')
  .get(getCart)
  .post(addToCart)
  .put(updateCartQuantity)
  .delete(clearCart);

router.route('/:productId').delete(removeFromCart);

export default router;
