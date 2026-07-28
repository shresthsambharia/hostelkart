import asyncHandler from 'express-async-handler';
import Wishlist from '../models/Wishlist.js';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants.js';

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private/Student
const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products').lean();

  if (!wishlist) {
    const newWishlist = await Wishlist.create({ user: req.user._id, products: [] });
    wishlist = newWishlist.toObject();
  }

  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin && wishlist.products) {
    wishlist.products = wishlist.products.filter(p => p && STUDENT_VISIBLE_CATEGORIES.includes(p.category));
  }

  res.json(wishlist);
});

// @desc    Toggle item in wishlist (Add/Remove)
// @route   POST /api/wishlist
// @access  Private/Student
const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    wishlist = await Wishlist.create({ user: req.user._id, products: [] });
  }

  const isFav = wishlist.products.includes(productId);

  if (isFav) {
    // Remove
    wishlist.products = wishlist.products.filter((id) => id.toString() !== productId);
  } else {
    // Add
    wishlist.products.push(productId);
  }

  await wishlist.save();
  const updatedWishlist = await Wishlist.findOne({ user: req.user._id }).populate('products').lean();
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin && updatedWishlist.products) {
    updatedWishlist.products = updatedWishlist.products.filter(p => p && STUDENT_VISIBLE_CATEGORIES.includes(p.category));
  }
  res.json(updatedWishlist);
});

export { getWishlist, toggleWishlist };
