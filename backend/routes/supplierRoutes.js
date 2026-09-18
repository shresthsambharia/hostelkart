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
  updateSupplierOrderItemStatus,
  getSupplierFinance,
  getSupplierPayouts,
  getSupplierLedger,
  getSettlementStatement,
  getSupplierProfile,
  updateSupplierProfile,
} from '../controllers/supplierController.js';
import { protect, supplier } from '../middleware/authMiddleware.js';

const router = express.Router();

// All supplier routes require authentication and supplier role
router.use(protect, supplier);

router.get('/dashboard', getSupplierDashboard);
router.get('/orders', getSupplierOrders);
router.patch('/orders/:id/items/:itemId/status', updateSupplierOrderItemStatus);

// Financial Overview, Payouts, Immutable Ledger & Settlement Statements
router.get('/finance/overview', getSupplierFinance);
router.get('/finance/payouts', getSupplierPayouts);
router.get('/finance/ledger', getSupplierLedger);
router.get('/finance/statements/:payoutId', getSettlementStatement);

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
