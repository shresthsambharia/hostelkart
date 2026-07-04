import express from 'express';
import {
  getDashboardAnalytics,
  addProduct,
  editProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  assignDeliveryPartner,
  getAllUsers,
  getDeliveryPartnersList,
  addDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  getAllCustomRequests,
  updateCustomRequestStatus,
  getPaymentSettings,
  updatePaymentSettings,
  updateOrderPaymentStatus,
  getAdminLogs,
  createOrderRefund,
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { logAdminActivity } from '../middleware/adminLogMiddleware.js';

const router = express.Router();

// Enforce admin check for all subroutes
router.use(protect, admin);
router.use(logAdminActivity); // Audit logs for all admin write operations

router.get('/analytics', getDashboardAnalytics);
router.get('/logs', getAdminLogs);
router.post('/products', addProduct);
router.route('/products/:id')
  .put(editProduct)
  .delete(deleteProduct);

router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.put('/orders/:id/assign', assignDeliveryPartner);
router.put('/orders/:id/payment', updateOrderPaymentStatus);
router.post('/orders/:id/refund', createOrderRefund);

router.get('/users', getAllUsers);
router.route('/delivery-partners')
  .get(getDeliveryPartnersList)
  .post(addDeliveryPartner);
router.route('/delivery-partners/:id')
  .put(updateDeliveryPartner)
  .delete(deleteDeliveryPartner);

router.route('/payment-settings')
  .get(getPaymentSettings)
  .put(updatePaymentSettings);

router.get('/custom-requests', getAllCustomRequests);
router.put('/custom-requests/:id', updateCustomRequestStatus);

export default router;
