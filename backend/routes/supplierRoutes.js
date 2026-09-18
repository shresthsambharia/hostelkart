import express from 'express';
import multer from 'multer';
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
  getSupplierPayoutById,
  getSupplierLedger,
  getSettlementStatement,
  getSupplierProfile,
  updateSupplierProfile,
  uploadSupplierPayoutQr,
} from '../controllers/supplierController.js';
import { protect, supplier } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// All supplier routes require authentication and supplier role
router.use(protect, supplier);

router.get('/dashboard', getSupplierDashboard);
router.get('/orders', getSupplierOrders);
router.patch('/orders/:id/items/:itemId/status', updateSupplierOrderItemStatus);

// Financial Overview, Payouts, Immutable Ledger & Settlement Statements
router.get('/finance', getSupplierFinance);
router.get('/finance/overview', getSupplierFinance);
router.get('/finance/payouts', getSupplierPayouts);
router.get('/finance/payouts/:id', getSupplierPayoutById);
router.get('/finance/ledger', getSupplierLedger);
router.get('/finance/statements/:payoutId', getSettlementStatement);

router.get('/payouts', getSupplierPayouts);
router.get('/payouts/:id', getSupplierPayoutById);

router.route('/profile')
  .get(getSupplierProfile)
  .put(updateSupplierProfile);

router.post('/profile/payout-qr', upload.single('image'), uploadSupplierPayoutQr);

router.route('/products')
  .get(getSupplierProducts)
  .post(createSupplierProduct);

router.route('/products/:id')
  .get(getSupplierProductById)
  .put(updateSupplierProduct)
  .delete(deleteSupplierProduct);

router.patch('/products/:id/stock', updateSupplierProductStock);

export default router;
