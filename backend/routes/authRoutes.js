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
  setup2FA,
  verify2FASetup,
  disable2FA,
  login2FA,
  regenerateRecoveryCodes,
  getCsrfToken,
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Rate limiter for security hardening on register and login endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 auth requests per windowMs
  message: { message: 'Too many authentication attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.get('/csrf', getCsrfToken);
router.get('/captcha', getCaptcha);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);
router.get('/debug-cookies', (req, res) => {
  res.json({
    headers: req.headers,
    cookies: req.headers.cookie || 'none',
  });
});

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, authUser);

// Two-Factor Authentication (2FA) Routes
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify-setup', protect, verify2FASetup);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/login', authLimiter, login2FA);
router.post('/verify-2fa', authLimiter, login2FA);
router.post('/2fa/recovery-codes', protect, regenerateRecoveryCodes);

router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.put('/fcm-token', protect, updateFcmToken);

export default router;
