import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import svgCaptcha from 'svg-captcha';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import Captcha from '../models/Captcha.js';
import RefreshToken from '../models/RefreshToken.js';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { generateSecret, verifyTOTP, generateRecoveryCodes } from '../utils/totp.js';
import { setCsrfCookie } from '../middleware/securityMiddleware.js';

// Helper to generate access token (15m expiry)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
};

// Helper to generate refresh token (7d expiry)
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Helper to set refresh token in secure HttpOnly cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Helper to set access token in secure HttpOnly cookie
const setAccessTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
  });
};

// @desc    Register a new student
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, referralCode, captchaId, captchaAnswer } = req.body;

  // 1. Email format check
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email)) {
    res.status(400);
    throw new Error('Please provide a valid email address');
  }

  // 2. Phone format check (E.164 format or standard 10 digit)
  if (!phone || (!/^\+?[1-9]\d{1,14}$/.test(phone.trim()) && !/^\d{10}$/.test(phone.trim()))) {
    res.status(400);
    throw new Error('Please provide a valid phone number (e.g. 10 digits or E.164 international format)');
  }

  // 3. Password strength check
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    res.status(400);
    throw new Error('Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)');
  }

  // CAPTCHA verification
  if (!captchaId || !captchaAnswer) {
    res.status(400);
    throw new Error('CAPTCHA verification required');
  }
  const captcha = await Captcha.findById(captchaId);
  if (!captcha || captcha.text !== captchaAnswer.toLowerCase()) {
    res.status(400);
    throw new Error('Invalid or expired CAPTCHA');
  }
  await Captcha.findByIdAndDelete(captchaId); // Delete immediately to prevent reuse

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Generate unique referral code for this new user
  let myReferralCode = '';
  let uniqueCodeFound = false;
  while (!uniqueCodeFound) {
    const code = (name.split(' ')[0] || 'HK').substring(0, 5).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
    const codeExists = await User.findOne({ referralCode: code });
    if (!codeExists) {
      myReferralCode = code;
      uniqueCodeFound = true;
    }
  }

  // Check if referred by someone else
  let referredByUser = null;
  if (referralCode) {
    referredByUser = await User.findOne({ referralCode: referralCode.toUpperCase() });
  }

  // Creating the user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'student', // Enforced role
    referralCode: myReferralCode,
    referredBy: referredByUser ? referredByUser._id : null,
  });

  if (user) {
    logger.info('AUTH_REGISTER_SUCCESS', `User registered successfully: ${user.email}`, {
      userId: user._id,
      email: user.email,
      role: user.role,
    });
    // Automatically initialize Cart and Wishlist for the student
    await Cart.create({ user: user._id, items: [] });
    await Wishlist.create({ user: user._id, products: [] });

    try {
      const { createAlert } = await import('./notificationController.js');
      await createAlert(
        user._id,
        'Welcome to HostelKart!',
        `Hello ${user.name}, your account has been successfully created. Welcome aboard!`,
        'Promo'
      );
    } catch (err) {
      console.error('Failed to trigger registration welcome alert:', err.message);
    }

    // Generate dual-tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to DB
    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);
    setAccessTokenCookie(res, token);
    const csrfToken = setCsrfCookie(res);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      hostelDetails: user.hostelDetails,
      token,
      csrfToken,
    });
  } else {
    logger.error('AUTH_REGISTER_FAILED', 'Failed to register user', { email });
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  logger.info('AUTH_LOGIN_ATTEMPT', `Login attempt initiated for email: ${email}`);

  let user;
  try {
    user = await User.findOne({ email });
  } catch (error) {
    logger.error('AUTH_LOGIN_DB_ERROR', `Database lookup error for email ${email}: ${error.message}`, { error });
    res.status(500);
    throw new Error('Database lookup failure during authentication');
  }

  if (!user) {
    logger.warn('AUTH_LOGIN_USER_NOT_FOUND', `Login failed: User not found for email: ${email}`);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check lockout
  if (user.lockUntil && user.lockUntil > Date.now()) {
    logger.warn('AUTH_LOGIN_LOCKED', `Login attempt blocked: Account locked for email ${email} until ${user.lockUntil}`);
    res.status(401);
    throw new Error('Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lock
      user.loginAttempts = 0; // reset attempts counter after locking
      await user.save();
      logger.warn('AUTH_LOGIN_LOCK_TRIGGERED', `Account locked for email ${email} due to 5 consecutive failures`);
      res.status(401);
      throw new Error('Account is temporarily locked. Please try again after 15 minutes.');
    }
    await user.save();
    logger.warn('AUTH_LOGIN_PASSWORD_MISMATCH', `Login failed: Password mismatch for email: ${email}. Attempt ${user.loginAttempts}/5`);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Reset attempts on successful password match
  if (user.loginAttempts > 0 || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  // Credentials are valid, proceed to login/2FA checks
  if (true) {
    // Check if Cart and Wishlist exist (asynchronously in the background to prevent blocking login response)
    if (user.role === 'student') {
      Cart.findOne({ user: user._id }).then(cart => {
        if (!cart) Cart.create({ user: user._id, items: [] }).catch(err => console.error('Cart auto-create failed:', err));
      }).catch(err => console.error('Cart check failed:', err));

      Wishlist.findOne({ user: user._id }).then(wishlist => {
        if (!wishlist) Wishlist.create({ user: user._id, products: [] }).catch(err => console.error('Wishlist auto-create failed:', err));
      }).catch(err => console.error('Wishlist check failed:', err));
    }

    // Check if 2FA is enabled (applicable to all users)
    if (user.twoFactorEnabled) {
      const twoFactorToken = jwt.sign(
        { id: user._id, is2faPending: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      
      logger.info('AUTH_LOGIN_2FA_REQUIRED', `2FA verification required for user: ${user.email}`, {
        userId: user._id,
        email: user.email,
      });

      return res.json({
        success: true,
        twoFactorRequired: true,
        requires2FA: true,
        twoFactorToken,
        tempToken: twoFactorToken,
        message: 'Enter your authenticator code.',
      });
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to DB
    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set refresh token and access token in HttpOnly cookies
    setRefreshTokenCookie(res, refreshToken);
    setAccessTokenCookie(res, token);
    const csrfToken = setCsrfCookie(res);

    logger.info('AUTH_LOGIN_SUCCESS', `User logged in successfully: ${user.email}`, {
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    if (user.role === 'admin') {
      const AdminLog = (await import('../models/AdminLog.js')).default;
      await AdminLog.create({
        admin: user._id,
        adminName: user.name,
        action: 'Admin Login',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: { email: user.email, success: true },
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      hostelDetails: user.hostelDetails,
      twoFactorEnabled: user.twoFactorEnabled,
      token,
      csrfToken,
    });
  } else {
    logger.warn('AUTH_LOGIN_FAILED', `Failed login attempt for email: ${email}`, { email });
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      hostelDetails: user.hostelDetails,
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile / hostel details
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;

    if (req.body.password) {
      user.password = req.body.password;
    }

    if (req.body.hostelDetails) {
      user.hostelDetails = {
        hostelName: req.body.hostelDetails.hostelName !== undefined ? req.body.hostelDetails.hostelName : user.hostelDetails.hostelName,
        block: req.body.hostelDetails.block !== undefined ? req.body.hostelDetails.block : user.hostelDetails.block,
        floor: req.body.hostelDetails.floor !== undefined ? req.body.hostelDetails.floor : user.hostelDetails.floor,
        roomNumber: req.body.hostelDetails.roomNumber !== undefined ? req.body.hostelDetails.roomNumber : user.hostelDetails.roomNumber,
        alternatePhone: req.body.hostelDetails.alternatePhone !== undefined ? req.body.hostelDetails.alternatePhone : user.hostelDetails.alternatePhone,
        landmark: req.body.hostelDetails.landmark !== undefined ? req.body.hostelDetails.landmark : user.hostelDetails.landmark,
        deliveryInstructions: req.body.hostelDetails.deliveryInstructions !== undefined ? req.body.hostelDetails.deliveryInstructions : user.hostelDetails.deliveryInstructions,
      };
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      hostelDetails: updatedUser.hostelDetails,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user FCM token
// @route   PUT /api/auth/fcm-token
// @access  Private
const updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  const user = await User.findById(req.user._id);

  if (user) {
    user.fcmToken = fcmToken || '';
    await user.save();
    res.json({ success: true, message: 'FCM Token updated successfully' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// Helper to manually parse a cookie from req.headers.cookie
const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => {
    const parts = c.split('=');
    return [parts[0].trim(), parts.slice(1).join('=')];
  });
  const match = cookies.find(c => c[0] === name);
  return match ? decodeURIComponent(match[1]) : null;
};

// @desc    Get visual CAPTCHA challenge
// @route   GET /api/auth/captcha
// @access  Public
const getCaptcha = asyncHandler(async (req, res) => {
  const cap = svgCaptcha.create({
    size: 4,
    noise: 2,
    color: true,
    background: '#f8fafc',
  });
  
  const captchaRecord = await Captcha.create({ text: cap.text.toLowerCase() });
  
  const csrfToken = setCsrfCookie(res);

  res.json({
    captchaId: captchaRecord._id,
    captchaSvg: cap.data,
    csrfToken,
  });
});

// @desc    Refresh access token using HttpOnly refresh token cookie
// @route   POST /api/auth/refresh
// @access  Public
const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = getCookieValue(req.headers.cookie, 'refreshToken');

  if (!refreshToken) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  const activeToken = await RefreshToken.findOne({ token: refreshToken });
  if (!activeToken) {
    res.status(401);
    throw new Error('Refresh token is invalid or expired');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    // Delete the old used refresh token (Rotation)
    await RefreshToken.deleteOne({ _id: activeToken._id });

    // Generate new dual tokens
    const accessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Save new refresh token in DB
    await RefreshToken.create({
      user: user._id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set updated HttpOnly cookies
    setRefreshTokenCookie(res, newRefreshToken);
    setAccessTokenCookie(res, accessToken);

    res.json({ token: accessToken });
  } catch (err) {
    res.status(401);
    throw new Error('Refresh token verification failed');
  }
});

// @desc    Logout user & clear refresh session
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = getCookieValue(req.headers.cookie, 'refreshToken');
  const token = getCookieValue(req.headers.cookie, 'token');

  logger.info('AUTH_LOGOUT', 'User logged out', { ip: req.ip });

  let userId = null;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      userId = decoded.id;
    } catch (e) {}
  } else if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      userId = decoded.id;
    } catch (e) {}
  }

  if (userId) {
    const user = await User.findById(userId);
    if (user && user.role === 'admin') {
      const AdminLog = (await import('../models/AdminLog.js')).default;
      await AdminLog.create({
        admin: user._id,
        adminName: user.name,
        action: 'Admin Logout',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: { email: user.email, success: true },
      });
    }
  }

  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

// @desc    Initiate 2FA setup or regeneration for admins
// @route   POST /api/auth/2fa/setup
// @access  Private (Admin Only)
const setup2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  // If already enabled, require password verification to regenerate
  if (user.twoFactorEnabled) {
    const { password } = req.body;
    if (!password) {
      res.status(400);
      throw new Error('Password confirmation required to regenerate 2FA');
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid password');
    }
  }

  const secret = generateSecret();
  user.twoFactorTempSecret = secret;
  await user.save();

  const otpauthUrl = `otpauth://totp/HostelKart:${encodeURIComponent(user.email)}?secret=${secret}&issuer=HostelKart`;
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  logger.info('AUTH_2FA_SETUP_INITIATED', `2FA setup initiated for admin: ${user.email}`, { userId: user._id });

  res.json({
    secret,
    qrCode: qrCodeDataUrl,
  });
});

// @desc    Verify TOTP code and enable 2FA
// @route   POST /api/auth/2fa/verify-setup
// @access  Private (Admin Only)
const verify2FASetup = asyncHandler(async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    res.status(400);
    throw new Error('Verification code is required');
  }

  const user = await User.findById(req.user._id);

  if (!user || user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  if (!user.twoFactorTempSecret) {
    res.status(400);
    throw new Error('2FA setup has not been initiated');
  }

  const isValid = verifyTOTP(code, user.twoFactorTempSecret);

  if (!isValid) {
    res.status(400);
    throw new Error('Invalid verification code');
  }

  // Encrypt the temp secret and store it securely
  user.twoFactorSecret = encrypt(user.twoFactorTempSecret);
  user.twoFactorTempSecret = '';
  user.twoFactorEnabled = true;

  // Generate 8 backup recovery codes
  const recoveryCodes = generateRecoveryCodes(8);
  // Hash recovery codes before saving
  user.twoFactorRecoveryCodes = await Promise.all(
    recoveryCodes.map(c => bcrypt.hash(c, 10))
  );

  await user.save();

  logger.info('AUTH_2FA_SETUP_SUCCESS', `2FA enabled successfully for admin: ${user.email}`, { userId: user._id });

  try {
    const { createAlert } = await import('./notificationController.js');
    await createAlert(
      user._id,
      'Two-Factor Authentication Enabled',
      `Hello ${user.name}, two-factor authentication (2FA) has been successfully enabled on your account.`,
      'SecurityAlert'
    );
  } catch (err) {
    console.error('Failed to trigger 2FA enable alert:', err.message);
  }

  res.json({
    success: true,
    recoveryCodes,
  });
});

// @desc    Disable 2FA for admin
// @route   POST /api/auth/2fa/disable
// @access  Private (Admin Only)
const disable2FA = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error('Password confirmation is required to disable 2FA');
  }

  const user = await User.findById(req.user._id);

  if (!user || user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid password');
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = '';
  user.twoFactorTempSecret = '';
  user.twoFactorRecoveryCodes = [];
  await user.save();

  logger.info('AUTH_2FA_DISABLED', `2FA disabled successfully for admin: ${user.email}`, { userId: user._id });

  res.json({
    success: true,
    message: '2FA disabled successfully',
  });
});

// Rate limiting attempts map for TOTP verification lockouts
const loginAttemptsMap = new Map();

// @desc    Complete 2FA login verification
// @route   POST /api/auth/2fa/login
// @route   POST /api/auth/verify-2fa
// @access  Public
const login2FA = asyncHandler(async (req, res) => {
  const tempToken = req.body.tempToken || req.body.twoFactorToken;
  const otp = req.body.otp || req.body.code;
  const isRecovery = req.body.isRecovery || (otp && otp.includes('-'));

  if (!otp || !tempToken) {
    res.status(400);
    throw new Error('Code and verification token are required');
  }

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    res.status(401);
    throw new Error('Login expired. Please login again.');
  }

  if (!decoded.is2faPending) {
    res.status(401);
    throw new Error('Invalid login session');
  }

  // Rate limiting failed verification attempts (Limit to 5)
  const attemptKey = decoded.id;
  const currentAttempts = loginAttemptsMap.get(attemptKey) || 0;
  if (currentAttempts >= 5) {
    logger.warn('AUTH_2FA_LOCKOUT_HIT', `2FA login attempts locked out for user ID: ${decoded.id}`, { ip: req.ip });
    res.status(429);
    throw new Error('Too many failed attempts. Please login again.');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error('User not found or unauthorized');
  }

  let isValid = false;

  if (isRecovery) {
    // Compare recovery code against hashed backup codes
    const cleanCode = otp.trim().toUpperCase();
    let codeIndex = -1;

    for (let i = 0; i < user.twoFactorRecoveryCodes.length; i++) {
      const isMatch = await bcrypt.compare(cleanCode, user.twoFactorRecoveryCodes[i]);
      if (isMatch) {
        codeIndex = i;
        break;
      }
    }

    if (codeIndex === -1) {
      loginAttemptsMap.set(attemptKey, currentAttempts + 1);
      logger.warn('AUTH_2FA_RECOVERY_FAILED', `Failed 2FA recovery code verification for user: ${user.email}. Attempt ${currentAttempts + 1}/5`, {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });
      res.status(401);
      throw new Error('Invalid authentication code');
    }

    // Remove the used recovery code
    user.twoFactorRecoveryCodes.splice(codeIndex, 1);
    await user.save();
    
    logger.info('AUTH_LOGIN_RECOVERY_USED', `Admin logged in using recovery code: ${user.email}`, { userId: user._id });
    isValid = true;
  } else {
    // Standard TOTP verification
    const decryptedSecret = decrypt(user.twoFactorSecret);
    isValid = verifyTOTP(otp, decryptedSecret);

    if (!isValid) {
      loginAttemptsMap.set(attemptKey, currentAttempts + 1);
      logger.warn('AUTH_2FA_VERIFICATION_FAILED', `Failed 2FA code verification for user: ${user.email}. Attempt ${currentAttempts + 1}/5`, {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });
      res.status(401);
      throw new Error('Invalid authentication code');
    }
    
    logger.info('AUTH_LOGIN_2FA_SUCCESS', `Admin 2FA verification succeeded: ${user.email}`, { userId: user._id });
  }

  // Clear attempts on successful validation
  loginAttemptsMap.delete(attemptKey);

  // Generate session tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to DB
  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // Set refresh token and access token cookies
  setRefreshTokenCookie(res, refreshToken);
  setAccessTokenCookie(res, token);
  const csrfToken = setCsrfCookie(res);

  if (user.role === 'admin') {
    const AdminLog = (await import('../models/AdminLog.js')).default;
    await AdminLog.create({
      admin: user._id,
      adminName: user.name,
      action: 'Admin Login',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      details: { email: user.email, success: true, via: '2FA' },
    });
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    hostelDetails: user.hostelDetails,
    twoFactorEnabled: user.twoFactorEnabled,
    token,
    csrfToken,
  });
});

// @desc    Regenerate backup recovery codes for admin
// @route   POST /api/auth/2fa/recovery-codes
// @access  Private (Admin Only)
const regenerateRecoveryCodes = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error('Password confirmation is required to regenerate recovery codes');
  }

  const user = await User.findById(req.user._id);

  if (!user || user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid password');
  }

  if (!user.twoFactorEnabled) {
    res.status(400);
    throw new Error('2FA is not enabled');
  }

  // Generate 8 new backup recovery codes
  const recoveryCodes = generateRecoveryCodes(8);
  // Hash recovery codes before saving
  user.twoFactorRecoveryCodes = await Promise.all(
    recoveryCodes.map(c => bcrypt.hash(c, 10))
  );

  await user.save();

  logger.info('AUTH_2FA_RECOVERY_REGENERATED', `Recovery codes regenerated for admin: ${user.email}`, { userId: user._id });

  res.json({
    success: true,
    recoveryCodes,
  });
});

export {
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
};
