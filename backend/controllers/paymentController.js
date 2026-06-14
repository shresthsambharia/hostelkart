import crypto from 'crypto';
import Razorpay from 'razorpay';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import User from '../models/User.js';
import RazorpayOrder from '../models/RazorpayOrder.js';
import { createAlert } from './notificationController.js';

// Get Razorpay client
const getRazorpayClient = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
  
  return new Razorpay({
    key_id,
    key_secret,
  });
};

const isPlaceholderKeys = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  return key_id.includes('placeholder') || !process.env.RAZORPAY_KEY_SECRET || key_id === 'rzp_test_T0oyPuoxShGQTU';
};

// @desc    Create Razorpay Order
// @route   POST /api/create-order or /api/payments/create-order
// @access  Private/Student
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency, receipt } = req.body;
  
  console.log('[DEBUG-PAYMENT] Backend Create Order REQUEST:', { amount, currency, receipt, url: req.originalUrl });

  if (amount === undefined || amount === null) {
    res.status(400);
    throw new Error('Amount is required');
  }

  // Standard endpoint /api/create-order uses paise directly.
  // Existing /api/payments/create-order route uses Rupees.
  const isRupees = req.originalUrl.includes('/payments/');
  const amountInPaisa = isRupees ? Math.round(Number(amount) * 100) : Math.round(Number(amount));

  if (amountInPaisa < 100) {
    res.status(400);
    throw new Error('Amount must be at least 100 paise');
  }

  // If using placeholder keys, return a mock order ID
  if (isPlaceholderKeys()) {
    const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    
    // Store in MongoDB
    await RazorpayOrder.create({
      razorpayOrderId: mockOrderId,
      amount: amountInPaisa,
      currency: currency || 'INR',
      status: 'created',
    });

    const mockResponse = {
      id: mockOrderId,
      order_id: mockOrderId,
      amount: amountInPaisa,
      currency: currency || 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      isMock: true,
    };

    console.log('[DEBUG-PAYMENT] Backend Create Order MOCK RESPONSE:', mockResponse);
    return res.json(mockResponse);
  }

  try {
    const razorpay = getRazorpayClient();
    const options = {
      amount: amountInPaisa,
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const rzpOrder = await razorpay.orders.create(options);
    
    // Store in MongoDB
    await RazorpayOrder.create({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      status: 'created',
    });

    const successResponse = {
      id: rzpOrder.id,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };

    console.log('[DEBUG-PAYMENT] Backend Create Order REAL RESPONSE:', successResponse);
    res.json(successResponse);
  } catch (error) {
    console.error('[DEBUG-PAYMENT] Backend Create Order ERROR:', error);
    // Check for Razorpay authentication failure
    if (error.statusCode === 401 || (error.error && error.error.description === 'Authentication failed') || (error.description && error.description.includes('Authentication'))) {
      res.status(401);
      throw new Error('Razorpay authentication failed: Invalid Key ID or Key Secret');
    }
    res.status(500);
    throw new Error(error.message || 'Razorpay Order Creation Failed');
  }
});

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/verify-payment or /api/payments/verify
// @access  Private/Student
const verifyPayment = asyncHandler(async (req, res) => {
  const order_id = req.body.razorpay_order_id || req.body.order_id;
  const payment_id = req.body.razorpay_payment_id || req.body.payment_id;
  const razorpay_signature = req.body.razorpay_signature || req.body.signature;

  console.log('[DEBUG-PAYMENT] Backend Verify Signature REQUEST:', { order_id, payment_id, razorpay_signature });

  if (!order_id || !payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('Order ID, Payment ID, and Signature are required');
  }

  // Handle mock verification for placeholder testing
  if (order_id.startsWith('order_mock_')) {
    const mockSuccessResponse = {
      success: true,
      message: 'Mock payment verified successfully',
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      razorpay_signature: 'mock_signature_passed',
    };
    console.log('[DEBUG-PAYMENT] Backend Verify Signature MOCK SUCCESS:', mockSuccessResponse);
    return res.json(mockSuccessResponse);
  }

  try {
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      res.status(500);
      throw new Error('Razorpay secret key not configured');
    }
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(`${order_id}|${payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === razorpay_signature) {
      const successResponse = {
        success: true,
        message: 'Payment verified successfully',
        razorpay_order_id: order_id,
        razorpay_payment_id: payment_id,
        razorpay_signature,
      };
      console.log('[DEBUG-PAYMENT] Backend Verify Signature SUCCESS:', successResponse);
      res.json(successResponse);
    } else {
      console.error('[DEBUG-PAYMENT] Backend Verify Signature MISMATCH. Generated:', generatedSignature, 'Received:', razorpay_signature);
      res.status(400);
      throw new Error('Invalid payment signature verification failed');
    }
  } catch (error) {
    console.error('[DEBUG-PAYMENT] Backend Verify Signature ERROR:', error);
    res.status(400);
    throw new Error(error.message || 'Payment Verification Failed');
  }
});

// Shared helper function to execute refunds
const refundOrderHelper = async (order, reason) => {
  console.log('[DEBUG-PAYMENT] Backend Refund Helper INITIATED:', { orderId: order._id, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, razorpayPaymentId: order.razorpayPaymentId, reason });

  // Check refund eligibility
  if (!['ONLINE', 'RAZORPAY'].includes(order.paymentMethod)) {
    console.warn('[DEBUG-PAYMENT] Backend Refund Helper SKIPPED: Method is not ONLINE/RAZORPAY');
    return { success: false, message: 'Refund not applicable for payment method: ' + order.paymentMethod };
  }
  if (!['Paid', 'PAID'].includes(order.paymentStatus)) {
    console.warn('[DEBUG-PAYMENT] Backend Refund Helper SKIPPED: Status is not Paid/PAID');
    return { success: false, message: 'Order payment status is not Paid' };
  }
  if (!order.razorpayPaymentId) {
    console.warn('[DEBUG-PAYMENT] Backend Refund Helper SKIPPED: Missing razorpayPaymentId');
    return { success: false, message: 'Order is missing Razorpay Payment ID' };
  }

  order.refundStatus = 'PROCESSING';
  order.refundReason = reason || 'Cancelled/Failed Order';
  await order.save();

  // Handle mock simulation for placeholder keys
  if (isPlaceholderKeys() || order.razorpayPaymentId.startsWith('pay_mock_') || order.razorpayPaymentId.startsWith('pay_test_')) {
    // If the payment ID is a test credential placeholder, or mock, simulate it
    if (isPlaceholderKeys() || order.razorpayPaymentId.startsWith('pay_mock_')) {
      console.warn(`[Refund Simulation] Simulating successful refund for Payment ID: ${order.razorpayPaymentId}`);
      
      order.refundStatus = 'REFUNDED';
      order.refundId = `rfnd_mock_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      order.refundAmount = order.totalAmount;
      order.refundedAt = Date.now();
      order.paymentStatus = 'Refunded';
      await order.save();

      // Trigger Notification for student
      await createAlert(
        order.user,
        'Refund Successful',
        `Your refund of ₹${order.totalAmount} for Order #${order._id.toString().substring(12).toUpperCase()} has been successfully processed.`,
        'StatusUpdate'
      );

      // Notify admins
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createAlert(
          admin._id,
          'Admin Refund Processed',
          `Refund of ₹${order.totalAmount} processed for Order #${order._id.toString().substring(12).toUpperCase()}.`,
          'StatusUpdate'
        );
      }

      console.log('[DEBUG-PAYMENT] Backend Refund Helper MOCK SUCCESS:', { refundId: order.refundId });
      return { success: true, refundId: order.refundId, isMock: true };
    }
  }

  try {
    const razorpay = getRazorpayClient();
    
    // Call Razorpay Refunds API
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: order.totalAmount * 100, // in paisa
      notes: {
        reason: reason || 'Cancelled/Failed Order',
        orderId: order._id.toString(),
      }
    });

    console.log('[DEBUG-PAYMENT] Backend Refund Helper REAL SUCCESS:', refund);

    order.refundStatus = 'REFUNDED';
    order.refundId = refund.id;
    order.refundAmount = order.totalAmount;
    order.refundedAt = Date.now();
    order.paymentStatus = 'Refunded';
    await order.save();

    // Trigger Notification for student
    await createAlert(
      order.user,
      'Refund Successful',
      `Your refund of ₹${order.totalAmount} for Order #${order._id.toString().substring(12).toUpperCase()} has been successfully processed.`,
      'StatusUpdate'
    );

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createAlert(
        admin._id,
        'Admin Refund Processed',
        `Refund of ₹${order.totalAmount} processed for Order #${order._id.toString().substring(12).toUpperCase()}.`,
        'StatusUpdate'
      );
    }

    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error('[DEBUG-PAYMENT] Backend Refund Helper ERROR:', error);
    order.refundStatus = 'FAILED';
    order.refundError = error.message || 'Unknown Razorpay error';
    await order.save();

    // Notify student about failed refund
    await createAlert(
      order.user,
      'Refund Failed',
      `Refund for Order #${order._id.toString().substring(12).toUpperCase()} failed. Our team will resolve it manually.`,
      'StatusUpdate'
    );

    // Notify admins about failure
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createAlert(
        admin._id,
        'Refund Failure Alert',
        `Refund of ₹${order.totalAmount} failed for Order #${order._id.toString().substring(12).toUpperCase()}. Error: ${order.refundError}`,
        'CancellationAlert'
      );
    }

    return { success: false, message: error.message };
  }
};

// @desc    Admin manual refund request
// @route   POST /api/payments/refund
// @access  Private/Admin
const refundOrder = asyncHandler(async (req, res) => {
  const { orderId, refundReason } = req.body;
  console.log('[DEBUG-PAYMENT] Backend Admin Manual Refund Request:', { orderId, refundReason });

  if (!orderId) {
    res.status(400);
    throw new Error('Order ID is required');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const result = await refundOrderHelper(order, refundReason);

  if (result.success) {
    res.json({ success: true, message: 'Refund processed successfully', order });
  } else {
    res.status(400);
    throw new Error(result.message || 'Refund request failed');
  }
});

export {
  createRazorpayOrder,
  verifyPayment,
  refundOrder,
  refundOrderHelper,
};
