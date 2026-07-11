import asyncHandler from 'express-async-handler';
import Wishlist from '../models/Wishlist.js';

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private/Student
const getWishlist = asyncHandler(async (req, res) => {
  let wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products').lean();

  if (!wishlist) {
    const newWishlist = await Wishlist.create({ user: req.user._id, products: [] });
    wishlist = newWishlist.toObject();
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
  res.json(updatedWishlist);
});

export { getWishlist, toggleWishlist };
