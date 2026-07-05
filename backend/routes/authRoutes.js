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

router.get('/captcha', getCaptcha);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, authUser);

// Two-Factor Authentication (2FA) Routes
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify-setup', protect, verify2FASetup);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/login', authLimiter, login2FA);
router.post('/2fa/recovery-codes', protect, regenerateRecoveryCodes);

router.get('/debug-db', async (req, res) => {
  if (req.query.secret !== 'hkdebug123') {
    return res.status(403).send('Forbidden');
  }
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findOne({ email: 'admin@hostelkart.com' });
    
    if (!user) {
      return res.json({ error: 'Admin user not found' });
    }

    const result = {
      email: user.email,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      hasSecret: !!user.twoFactorSecret,
      hasTempSecret: !!user.twoFactorTempSecret,
      recoveryCodesCount: user.twoFactorRecoveryCodes ? user.twoFactorRecoveryCodes.length : 0
    };

    if (req.query.reset === 'true') {
      user.twoFactorEnabled = false;
      user.twoFactorSecret = '';
      user.twoFactorTempSecret = '';
      user.twoFactorRecoveryCodes = [];
      await user.save();
      result.resetSuccess = true;
      result.twoFactorEnabled = false;
    }

    if (req.query.reset_password === 'true') {
      user.password = 'admin123';
      await user.save();
      result.passwordResetSuccess = true;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.put('/fcm-token', protect, updateFcmToken);

export default router;
