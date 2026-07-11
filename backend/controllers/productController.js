import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { invalidateProductCache } from '../middleware/cacheMiddleware.js';

// Helper to log search keyword frequency asynchronously
const logSearchKeyword = async (rawKeyword) => {
  if (!rawKeyword) return;
  const keyword = rawKeyword.trim().toLowerCase();
  if (keyword.length < 2) return;
  try {
    const SearchKeyword = (await import('../models/SearchKeyword.js')).default;
    await SearchKeyword.findOneAndUpdate(
      { keyword },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Failed to log search keyword:', err);
  }
};

// @desc    Fetch all products with filters, search, and category selection
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const { keyword, category, minPrice, maxPrice } = req.query;

  let query = {};

  // Keyword Search (case insensitive)
  if (keyword) {
    query.name = {
      $regex: keyword,
      $options: 'i',
    };
    // Log search keyword for trending recommendations
    logSearchKeyword(keyword);
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price Range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) {
      query.price.$gte = Number(minPrice);
    }
    if (maxPrice) {
      query.price.$lte = Number(maxPrice);
    }
  }

  const products = await Product.find(query).lean();
  res.setHeader('Cache-Control', 'public, max-age=15');
  res.json(products);
});

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();

  if (product) {
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create new review for a product
// @route   POST /api/products/:id/reviews
// @access  Private/Student
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (rating === undefined || comment === undefined || comment.trim() === '') {
    res.status(400);
    throw new Error('Rating and comment are required and comment cannot be empty');
  }
  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400);
    throw new Error('Rating must be a number between 1 and 5');
  }

  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error('Product already reviewed by this user');
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;

    // Recalculate average rating
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    await invalidateProductCache(product._id);
    res.status(201).json({ message: 'Review added successfully' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get all product categories
// @route   GET /api/products/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).lean();
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(categories);
});

// @desc    Get instant search suggestions
// @route   GET /api/products/search/suggest
// @access  Public
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const q = req.query.q;
  if (!q || q.trim() === '') {
    return res.json({ products: [], categories: [] });
  }

  const queryRegex = { $regex: q, $options: 'i' };

  // Find matching products
  const products = await Product.find({
    $or: [
      { name: queryRegex },
      { description: queryRegex },
      { category: queryRegex }
    ]
  })
  .select('name category image price discount')
  .limit(6)
  .lean();

  // Find matching categories
  const categories = await Category.find({ name: queryRegex })
    .select('name image')
    .limit(3)
    .lean();

  // Track the search query asynchronously
  logSearchKeyword(q);

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ products, categories });
});

// @desc    Get trending searches
// @route   GET /api/products/search/trending
// @access  Public
const getTrendingSearches = asyncHandler(async (req, res) => {
  const SearchKeyword = (await import('../models/SearchKeyword.js')).default;
  const trending = await SearchKeyword.find({})
    .sort({ count: -1 })
    .limit(8)
    .select('keyword count')
    .lean();
  res.json(trending);
});

export { getProducts, getProductById, createProductReview, getCategories, getSearchSuggestions, getTrendingSearches };
