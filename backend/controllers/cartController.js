import asyncHandler from 'express-async-handler';
import Cart from '../models/Cart.js';

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private/Student
const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  res.json(cart);
});

// @desc    Add product to cart
// @route   POST /api/cart
// @access  Private/Student
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const qty = Number(quantity) || 1;

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

  if (itemIndex > -1) {
    // Product exists, update quantity
    cart.items[itemIndex].quantity += qty;
  } else {
    // Add new product item
    cart.items.push({ product: productId, quantity: qty });
  }

  await cart.save();
  const updatedCart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  res.json(updatedCart);
});

// @desc    Update cart item quantity
// @route   PUT /api/cart
// @access  Private/Student
const updateCartQuantity = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const qty = Number(quantity);

  if (qty < 1) {
    res.status(400);
    throw new Error('Quantity must be at least 1');
  }

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity = qty;
    await cart.save();
    const updatedCart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    res.json(updatedCart);
  } else {
    res.status(404);
    throw new Error('Product not in cart');
  }
});

// @desc    Remove product from cart
// @route   DELETE /api/cart/:productId
// @access  Private/Student
const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  cart.items = cart.items.filter((item) => item.product.toString() !== req.params.productId);

  await cart.save();
  const updatedCart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  res.json(updatedCart);
});

// @desc    Clear all items in cart
// @route   DELETE /api/cart
// @access  Private/Student
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  cart.items = [];
  await cart.save();

  res.json(cart);
});

export { getCart, addToCart, updateCartQuantity, removeFromCart, clearCart };
