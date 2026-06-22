import express from 'express';
import { getWalletDetails } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWalletDetails);

export default router;
