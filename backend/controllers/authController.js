import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new student
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, referralCode } = req.body;

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
    // Automatically initialize Cart and Wishlist for the student
    await Cart.create({ user: user._id, items: [] });
    await Wishlist.create({ user: user._id, products: [] });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      hostelDetails: user.hostelDetails,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // Check if Cart and Wishlist exist (just in case they were seeded without them)
    if (user.role === 'student') {
      const cartExists = await Cart.findOne({ user: user._id });
      if (!cartExists) {
        await Cart.create({ user: user._id, items: [] });
      }
      const wishlistExists = await Wishlist.findOne({ user: user._id });
      if (!wishlistExists) {
        await Wishlist.create({ user: user._id, products: [] });
      }
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      hostelDetails: user.hostelDetails,
      token: generateToken(user._id),
    });
  } else {
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

export { registerUser, authUser, getUserProfile, updateUserProfile, updateFcmToken };
