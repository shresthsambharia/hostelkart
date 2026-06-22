import asyncHandler from 'express-async-handler';
import WalletTransaction from '../models/WalletTransaction.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

// @desc    Get user's wallet details, transaction history, and loyalty details
// @route   GET /api/wallet
// @access  Private
export const getWalletDetails = asyncHandler(async (req, res) => {
  const transactions = await WalletTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  // Get delivered orders count to determine loyalty level
  const deliveredOrdersCount = await Order.countDocuments({
    user: req.user._id,
    orderStatus: 'Delivered',
  });

  // Calculate Loyalty Level
  let loyaltyLevel = 'Bronze';
  let cashbackPercent = 1;
  if (deliveredOrdersCount >= 30) {
    loyaltyLevel = 'Platinum';
    cashbackPercent = 5;
  } else if (deliveredOrdersCount >= 15) {
    loyaltyLevel = 'Gold';
    cashbackPercent = 3;
  } else if (deliveredOrdersCount >= 5) {
    loyaltyLevel = 'Silver';
    cashbackPercent = 2;
  }

  // Update user's loyalty level in database if changed
  if (req.user.loyaltyLevel !== loyaltyLevel) {
    req.user.loyaltyLevel = loyaltyLevel;
    await req.user.save();
  }

  // Calculate total cashback earned
  const cashbackTransactions = transactions.filter(t => t.type === 'cashback' || t.type === 'referral');
  const totalCashbackEarned = cashbackTransactions.reduce((acc, t) => acc + t.amount, 0);

  res.json({
    walletBalance: req.user.walletBalance,
    transactions,
    loyaltyLevel,
    cashbackPercent,
    deliveredOrdersCount,
    totalCashbackEarned,
  });
});
