import express from 'express';
import {
  getSupplierDashboard,
  getSupplierProducts,
  getSupplierProductById,
  createSupplierProduct,
  updateSupplierProduct,
  updateSupplierProductStock,
  deleteSupplierProduct,
  getSupplierOrders,
  getSupplierProfile,
  updateSupplierProfile,
} from '../controllers/supplierController.js';
import { protect, supplier } from '../middleware/authMiddleware.js';

const router = express.Router();

// All supplier routes require authentication and supplier role
router.use(protect, supplier);

router.get('/dashboard', getSupplierDashboard);
router.get('/orders', getSupplierOrders);
router.route('/profile')
  .get(getSupplierProfile)
  .put(updateSupplierProfile);

router.route('/products')
  .get(getSupplierProducts)
  .post(createSupplierProduct);

router.route('/products/:id')
  .get(getSupplierProductById)
  .put(updateSupplierProduct)
  .delete(deleteSupplierProduct);

router.patch('/products/:id/stock', updateSupplierProductStock);

export default router;
