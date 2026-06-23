import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerUser,
  authUser,
  getUserProfile,
  updateUserProfile,
  updateFcmToken,
  getCaptcha,
  refreshAccessToken,
  logoutUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

// Rate limiter for security hardening on register and login endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 auth requests per windowMs
  message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.get('/captcha', getCaptcha);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, authUser);

router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.put('/fcm-token', protect, updateFcmToken);

export default router;
