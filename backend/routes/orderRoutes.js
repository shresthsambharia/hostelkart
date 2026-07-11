import express from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  getPaymentSettingsForCheckout,
  cancelOrder,
  submitUPIPayment,
  getOrderQRCode,
  getPaymentHistory,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { checkoutLimiter } from '../middleware/securityMiddleware.js';
import { cache } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('student'), checkoutLimiter, createOrder);
router.get('/myorders', protect, authorize('student'), getMyOrders);
router.get('/payment-history', protect, authorize('student'), getPaymentHistory);
router.get('/payment-settings', protect, cache(3600), getPaymentSettingsForCheckout);
router.get('/:id/qr-code', getOrderQRCode);
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/submit-payment', protect, authorize('student'), submitUPIPayment);

export default router;
