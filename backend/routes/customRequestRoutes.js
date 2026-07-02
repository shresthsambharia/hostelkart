import express from 'express';
import {
  createCustomRequest,
  getMyCustomRequests,
} from '../controllers/customRequestController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { customRequestLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();

router.use(protect, authorize('student'));

router.post('/', customRequestLimiter, createCustomRequest);
router.get('/myrequests', getMyCustomRequests);

export default router;
