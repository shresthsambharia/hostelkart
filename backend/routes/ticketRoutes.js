import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  createTicket,
  getTickets,
  getTicketById,
  addMessage,
  closeTicket,
  rateTicket,
  adminGetTickets,
  adminUpdateTicket,
  adminGetAnalytics,
} from '../controllers/ticketController.js';

const router = express.Router();

// Enforce auth check for all endpoints
router.use(protect);

// Customer Support ticket routes
router.route('/')
  .post(createTicket)
  .get(getTickets);

router.route('/admin')
  .get(admin, adminGetTickets);

router.route('/admin/analytics')
  .get(admin, adminGetAnalytics);

router.route('/admin/:id')
  .put(admin, adminUpdateTicket);

router.route('/:id')
  .get(getTicketById);

router.route('/:id/messages')
  .post(addMessage);

router.route('/:id/close')
  .put(closeTicket);

router.route('/:id/rate')
  .put(rateTicket);

export default router;
