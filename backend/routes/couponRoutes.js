import express from 'express';
import {
  validateCoupon,
  getCoupons,
  adminGetCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
} from '../controllers/couponController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { cache } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, cache(300), getCoupons);

router.post('/validate', protect, validateCoupon);

router.route('/admin')
  .get(protect, admin, cache(300), adminGetCoupons)
  .post(protect, admin, adminCreateCoupon);

router.route('/admin/:id')
  .put(protect, admin, adminUpdateCoupon)
  .delete(protect, admin, adminDeleteCoupon);

export default router;
