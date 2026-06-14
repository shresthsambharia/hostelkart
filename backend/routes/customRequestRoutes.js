import express from 'express';
import {
  createCustomRequest,
  getMyCustomRequests,
} from '../controllers/customRequestController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorize('student'));

router.post('/', createCustomRequest);
router.get('/myrequests', getMyCustomRequests);

export default router;
