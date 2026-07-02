import express from 'express';
import multer from 'multer';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  exportProducts,
  exportOrders,
  exportCustomers,
  exportRevenue,
  importProducts,
  bulkInventoryUpdate
} from '../controllers/excelController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
  fileFilter: (req, file, cb) => {
    const parts = file.originalname.split('.');
    if (parts.length > 2) {
      return cb(new Error('Excel files only - multiple file extensions not allowed!'));
    }
    const ext = parts.pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      cb(null, true);
    } else {
      cb(new Error('Excel files only (.xlsx, .xls)!'));
    }
  }
});

// Protect all routes with auth + admin checks
router.use(protect);
router.use(admin);

router.get('/export-products', exportProducts);
router.get('/export-orders', exportOrders);
router.get('/export-customers', exportCustomers);
router.get('/export-revenue', exportRevenue);

router.post('/import-products', upload.single('file'), importProducts);
router.post('/bulk-inventory', upload.single('file'), bulkInventoryUpdate);

export default router;
