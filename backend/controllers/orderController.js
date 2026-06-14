import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { createAlert } from './notificationController.js';
import { refundOrderHelper } from './paymentController.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Student
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    deliveryDetails,
    deliverySlot,
    paymentMethod,
    paymentStatus,
    platformFee,
    deliveryCharge,
    totalAmount,
    utrNumber,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // Double check stock and adjust stock
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.name} not found`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}`);
    }
  }

  // Generate a random 4-digit delivery OTP
  const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

  // Create order
  const order = new Order({
    user: req.user._id,
    items: orderItems.map((x) => ({
      product: x.product,
      name: x.name,
      quantity: Number(x.quantity),
      price: Number(x.price),
      discount: Number(x.discount || 0),
    })),
    deliveryDetails,
    deliverySlot,
    paymentMethod,
    paymentStatus: paymentStatus || 'Pending',
    paidAt: (paymentStatus === 'Paid' || paymentStatus === 'PAID') ? Date.now() : null,
    paymentFailureReason: req.body.paymentFailureReason || '',
    platformFee: platformFee !== undefined ? Number(platformFee) : 15,
    deliveryCharge: deliveryCharge !== undefined ? Number(deliveryCharge) : 15,
    totalAmount,
    utrNumber: utrNumber || '',
    razorpayOrderId: req.body.razorpayOrderId || '',
    razorpayPaymentId: req.body.razorpayPaymentId || '',
    razorpaySignature: req.body.razorpaySignature || '',
    deliveryOtp,
    timeline: [
      {
        status: 'Pending',
        note: 'Order placed successfully',
      },
    ],
  });

  const createdOrder = await order.save();

  // Notify Admins about the new order
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await createAlert(
      admin._id,
      'New Order Placed',
      `Order #${createdOrder._id.toString().substring(12).toUpperCase()} of INR ${createdOrder.totalAmount} has been placed by ${req.user.name}.`,
      'NewOrder'
    );
  }

  // Check for low stock alert on items just ordered
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (product && product.stock < 10) {
      for (const admin of admins) {
        await createAlert(
          admin._id,
          'Low Stock Alert',
          `Product "${product.name}" is low on stock (${product.stock} left). Please restock soon.`,
          'LowStockAlert'
        );
      }
    }
  }

  // Save/Update default hostelDetails for the user
  await User.findByIdAndUpdate(req.user._id, {
    phone: deliveryDetails.phone,
    hostelDetails: {
      hostelName: deliveryDetails.hostelName,
      block: deliveryDetails.block,
      floor: deliveryDetails.floor,
      roomNumber: deliveryDetails.roomNumber,
      alternatePhone: deliveryDetails.alternatePhone || '',
      landmark: deliveryDetails.landmark || '',
      deliveryInstructions: deliveryDetails.deliveryInstructions || ''
    }
  });

  // Deduct product stocks
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // Clear cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  res.status(201).json(createdOrder);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('deliveryPartner', 'name email phone');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Verify access: Student can view their own, Admin or Delivery Partner can view assigned
  if (
    req.user.role === 'student' &&
    order.user._id.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json(order);
});

// @desc    Get logged in user orders
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get Shop Payment Settings for Checkout
// @route   GET /api/orders/payment-settings
// @access  Private
const getPaymentSettingsForCheckout = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ key: 'payment_config' });
  if (!settings) {
    settings = await Settings.create({
      key: 'payment_config',
      value: {
        upiId: 'hostelkart@upi',
        qrCodeUrl: '',
      },
    });
  }
  res.json(settings.value);
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private/Student
const cancelOrder = asyncHandler(async (req, res) => {
  const { cancellationReason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Authorize student or admin
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  // Validate current status
  if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Confirmed') {
    res.status(400);
    throw new Error(`Cannot cancel order once it is ${order.orderStatus}`);
  }

  order.orderStatus = 'Cancelled';
  order.cancelledAt = Date.now();
  order.cancellationReason = cancellationReason || 'Cancelled by student';

  // Refund product stock back
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  order.timeline.push({
    status: 'Cancelled',
    note: cancellationReason || 'Cancelled by student',
  });

  let updatedOrder = await order.save();

  // Trigger auto-refund for prepaid online order
  if (['ONLINE', 'RAZORPAY'].includes(updatedOrder.paymentMethod) && ['Paid', 'PAID'].includes(updatedOrder.paymentStatus)) {
    const refundResult = await refundOrderHelper(updatedOrder, cancellationReason || 'Cancelled by student');
    if (refundResult.success) {
      updatedOrder = await Order.findById(updatedOrder._id);
    }
  }

  // Notify Admins about the cancellation
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await createAlert(
      admin._id,
      'Order Cancellation Alert',
      `Order #${order._id.toString().substring(12).toUpperCase()} was cancelled by student ${req.user.name}. Reason: "${order.cancellationReason}"`,
      'CancellationAlert'
    );
  }

  res.json(updatedOrder);
});

export { createOrder, getOrderById, getMyOrders, getPaymentSettingsForCheckout, cancelOrder };
