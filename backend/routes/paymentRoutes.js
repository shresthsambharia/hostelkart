import express from 'express';
import {
  createCashfreeSession,
  verifyPayment,
  refundOrder,
  handleCashfreeWebhook,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Cashfree public webhook endpoint
router.post('/webhook', handleCashfreeWebhook);

// Private student payment actions
router.post('/create-order', protect, authorize('student'), createCashfreeSession);
router.post('/verify-payment', protect, authorize('student'), verifyPayment);
router.post('/verify/:id', protect, authorize('student'), verifyPayment);
router.post('/verify', protect, authorize('student'), verifyPayment);

// Private admin refund actions
router.post('/refund', protect, authorize('admin'), refundOrder);

export default router;
