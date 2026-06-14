import express from 'express';
import {
  createRazorpayOrder,
  verifyPayment,
  refundOrder,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-order', protect, authorize('student'), createRazorpayOrder);
router.post('/verify-payment', protect, authorize('student'), verifyPayment);
router.post('/verify', protect, authorize('student'), verifyPayment);
router.post('/refund', protect, authorize('admin'), refundOrder);

export default router;
