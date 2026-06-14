import express from 'express';
import { getWishlist, toggleWishlist } from '../controllers/wishlistController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('student'));

router.route('/')
  .get(getWishlist)
  .post(toggleWishlist);

export default router;
