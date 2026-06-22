import asyncHandler from 'express-async-handler';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { sendPushNotification } from '../utils/fcm.js';
import User from '../models/User.js';

// @desc    Validate a coupon code
// @route   POST /api/coupons/validate
// @access  Private
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount } = req.body;

  if (!code) {
    res.status(400);
    throw new Error('Coupon code is required');
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    res.status(404);
    throw new Error('Invalid coupon code');
  }

  if (!coupon.active) {
    res.status(400);
    throw new Error('Coupon is inactive');
  }

  if (new Date(coupon.expiryDate) < new Date()) {
    res.status(400);
    throw new Error('Coupon has expired');
  }

  if (coupon.usageCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error('Coupon usage limit reached');
  }

  if (orderAmount < coupon.minimumOrderAmount) {
    res.status(400);
    throw new Error(`Minimum order amount of ₹${coupon.minimumOrderAmount} required for this coupon`);
  }

  // Check first order only rule
  if (coupon.firstOrderOnly) {
    const existingOrdersCount = await Order.countDocuments({
      user: req.user._id,
      orderStatus: { $ne: 'Cancelled' },
    });
    if (existingOrdersCount > 0) {
      res.status(400);
      throw new Error('This coupon is valid for your first order only');
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maximumDiscount && coupon.maximumDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
    }
  } else if (coupon.discountType === 'fixed') {
    discountAmount = coupon.discountValue;
  } else if (coupon.discountType === 'free_delivery') {
    // Front-end handles this or sets to delivery charge
    discountAmount = 0; // Handled separately or as special case
  }

  res.json({
    success: true,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maximumDiscount: coupon.maximumDiscount,
    discountAmount: Math.min(discountAmount, orderAmount),
    allowWalletCombination: coupon.allowWalletCombination,
  });
});

// @desc    Get active coupons for students
// @route   GET /api/coupons
// @access  Private
export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({
    active: true,
    expiryDate: { $gt: new Date() },
  });
  res.json(coupons);
});

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons/admin
// @access  Private/Admin
export const adminGetCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({});
  res.json(coupons);
});

// @desc    Create a coupon (Admin)
// @route   POST /api/coupons/admin
// @access  Private/Admin
export const adminCreateCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minimumOrderAmount,
    maximumDiscount,
    expiryDate,
    usageLimit,
    firstOrderOnly,
    allowWalletCombination,
  } = req.body;

  const couponExists = await Coupon.findOne({ code: code.toUpperCase() });

  if (couponExists) {
    res.status(400);
    throw new Error('Coupon code already exists');
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    description,
    discountType,
    discountValue,
    minimumOrderAmount,
    maximumDiscount,
    expiryDate,
    usageLimit,
    firstOrderOnly,
    allowWalletCombination,
  });

  // Notify all users about the new coupon promo
  const students = await User.find({ role: 'student' });
  for (const student of students) {
    await sendPushNotification(
      student._id,
      '🎉 New Offer Available!',
      `Use code ${coupon.code} to get discount on your next order. Details: ${coupon.description}`,
      'Promo'
    );
  }

  res.status(201).json(coupon);
});

// @desc    Update a coupon (Admin)
// @route   PUT /api/coupons/admin/:id
// @access  Private/Admin
export const adminUpdateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  coupon.code = req.body.code ? req.body.code.toUpperCase() : coupon.code;
  coupon.description = req.body.description || coupon.description;
  coupon.discountType = req.body.discountType || coupon.discountType;
  coupon.discountValue = req.body.discountValue !== undefined ? req.body.discountValue : coupon.discountValue;
  coupon.minimumOrderAmount = req.body.minimumOrderAmount !== undefined ? req.body.minimumOrderAmount : coupon.minimumOrderAmount;
  coupon.maximumDiscount = req.body.maximumDiscount !== undefined ? req.body.maximumDiscount : coupon.maximumDiscount;
  coupon.expiryDate = req.body.expiryDate || coupon.expiryDate;
  coupon.usageLimit = req.body.usageLimit !== undefined ? req.body.usageLimit : coupon.usageLimit;
  coupon.firstOrderOnly = req.body.firstOrderOnly !== undefined ? req.body.firstOrderOnly : coupon.firstOrderOnly;
  coupon.allowWalletCombination = req.body.allowWalletCombination !== undefined ? req.body.allowWalletCombination : coupon.allowWalletCombination;
  coupon.active = req.body.active !== undefined ? req.body.active : coupon.active;

  const updatedCoupon = await coupon.save();
  res.json(updatedCoupon);
});

// @desc    Delete a coupon (Admin)
// @route   DELETE /api/coupons/admin/:id
// @access  Private/Admin
export const adminDeleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  await coupon.deleteOne();
  res.json({ message: 'Coupon removed successfully' });
});
