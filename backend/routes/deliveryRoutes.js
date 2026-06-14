import express from 'express';
import {
  getAssignedOrders,
  updateDeliveryStatus,
  getDeliveryHistory,
} from '../controllers/deliveryController.js';
import { protect, delivery } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, delivery);

router.get('/orders', getAssignedOrders);
router.get('/history', getDeliveryHistory);
router.put('/orders/:id/status', updateDeliveryStatus);

export default router;
