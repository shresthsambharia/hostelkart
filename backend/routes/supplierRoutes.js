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
  getSupplierOnboardingConfig,
  getSupplierOnboardingStatus,
  submitSupplierOnboardingPayment,
} from '../controllers/supplierController.js';
import { protect, supplier, verifiedSupplier } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// All supplier routes require authentication and supplier role
router.use(protect, supplier);

// Onboarding endpoints (available before payment verification)
router.get('/onboarding/config', getSupplierOnboardingConfig);
router.get('/onboarding/status', getSupplierOnboardingStatus);
router.post('/onboarding/submit', submitSupplierOnboardingPayment);

// Profile endpoints (accessible to review contact info)
router.route('/profile')
  .get(getSupplierProfile)
  .put(updateSupplierProfile);

// Protected routes requiring verified/approved onboarding payment
router.get('/dashboard', verifiedSupplier, getSupplierDashboard);
router.get('/orders', verifiedSupplier, getSupplierOrders);
router.patch('/orders/:id/items/:itemId/status', verifiedSupplier, updateSupplierOrderItemStatus);

// Financial Overview, Payouts, Immutable Ledger & Settlement Statements
router.get('/finance', verifiedSupplier, getSupplierFinance);
router.get('/finance/overview', verifiedSupplier, getSupplierFinance);
router.get('/finance/payouts', verifiedSupplier, getSupplierPayouts);
router.get('/finance/payouts/:id', verifiedSupplier, getSupplierPayoutById);
router.get('/finance/ledger', verifiedSupplier, getSupplierLedger);
router.get('/finance/statements/:payoutId', verifiedSupplier, getSettlementStatement);

router.get('/payouts', verifiedSupplier, getSupplierPayouts);
router.get('/payouts/:id', verifiedSupplier, getSupplierPayoutById);

router.post('/profile/payout-qr', verifiedSupplier, upload.single('image'), uploadSupplierPayoutQr);

router.route('/products')
  .get(verifiedSupplier, getSupplierProducts)
  .post(verifiedSupplier, createSupplierProduct);

router.route('/products/:id')
  .get(verifiedSupplier, getSupplierProductById)
  .put(verifiedSupplier, updateSupplierProduct)
  .delete(verifiedSupplier, deleteSupplierProduct);

router.patch('/products/:id/stock', verifiedSupplier, updateSupplierProductStock);

export default router;

