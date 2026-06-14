import express from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  getPaymentSettingsForCheckout,
  cancelOrder,
} from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('student'), createOrder);
router.get('/myorders', protect, authorize('student'), getMyOrders);
router.get('/payment-settings', protect, getPaymentSettingsForCheckout);
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelOrder);

export default router;
