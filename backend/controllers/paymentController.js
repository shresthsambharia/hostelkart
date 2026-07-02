import crypto from 'crypto';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import User from '../models/User.js';
import CashfreeOrder from '../models/CashfreeOrder.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import { createAlert } from './notificationController.js';
import sendEmail from '../utils/sendEmail.js';

let cashfreeInstance = null;

const getCashfreeInstance = () => {
  if (cashfreeInstance) return cashfreeInstance;

  const appId = process.env.CASHFREE_APP_ID || '';
  const secretKey = process.env.CASHFREE_SECRET_KEY || '';
  const env = process.env.CASHFREE_ENV || 'TEST';

  cashfreeInstance = new Cashfree(
    env === 'PRODUCTION' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
    appId,
    secretKey
  );
  console.log(`[Startup] Cashfree SDK instance created for App ID: ${appId} in ${env} environment.`);
  return cashfreeInstance;
};

const isPlaceholderKeys = () => {
  const appId = process.env.CASHFREE_APP_ID || '';
  return appId.includes('placeholder') || !appId || !process.env.CASHFREE_SECRET_KEY;
};

const createCashfreeSession = asyncHandler(async (req, res) => {
  const { amount, currency, orderId } = req.body;
  
  console.log('[DEBUG-PAYMENT] Backend Create Cashfree Session REQUEST:', { amount, currency, orderId });

  if (amount === undefined || amount === null) {
    res.status(400);
    throw new Error('Amount is required');
  }

  const numericAmount = Number(amount);
  const rupeeAmount = numericAmount > 2000 ? numericAmount / 100 : numericAmount;

  let targetOrderId = orderId;
  let order;

  if (!targetOrderId) {
    console.log('[DEBUG-PAYMENT] orderId not provided. Creating a mock pending order for test script support...');
    // Find or create test product
    let product = await Product.findOne();
    if (!product) {
      product = new Product({
        name: 'Test Milk Pack 1L',
        price: 60,
        stock: 100,
        category: 'Dairy Products',
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300',
        description: 'Test dairy item'
      });
      await product.save();
    }

    order = new Order({
      user: req.user._id,
      items: [
        {
          product: product._id,
          name: product.name,
          quantity: 1,
          price: rupeeAmount,
          discount: 0
        }
      ],
      deliveryDetails: {
        hostelName: (req.user.hostelDetails && req.user.hostelDetails.hostelName) || 'Ramanujan Hostel',
        block: (req.user.hostelDetails && req.user.hostelDetails.block) || 'A-Block',
        floor: (req.user.hostelDetails && req.user.hostelDetails.floor) || '3rd Floor',
        roomNumber: (req.user.hostelDetails && req.user.hostelDetails.roomNumber) || '302',
        phone: (req.user.hostelDetails && req.user.hostelDetails.phone) || req.user.phone || '9999999999',
        name: (req.user.hostelDetails && req.user.hostelDetails.name) || req.user.name || 'Test Student'
      },
      deliverySlot: 'Immediate',
      paymentMethod: 'ONLINE',
      paymentStatus: 'Pending',
      totalAmount: rupeeAmount,
      deliveryOtp: '1234',
      paymentProvider: 'Cashfree'
    });

    const savedOrder = await order.save();
    targetOrderId = savedOrder._id.toString();
    console.log('[DEBUG-PAYMENT] Mock pending order created with ID:', targetOrderId);
  } else {
    order = await Order.findById(targetOrderId);
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }
  }

  // If using placeholder keys, return a mock order session
  if (isPlaceholderKeys()) {
    const mockSessionId = `session_mock_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    
    // Store in MongoDB
    await CashfreeOrder.create({
      cfOrderId: targetOrderId,
      paymentSessionId: mockSessionId,
      amount: rupeeAmount,
      currency: currency || 'INR',
      status: 'created',
    });

    // Update main Order
    order.paymentProvider = 'Cashfree';
    order.cf_order_id = targetOrderId;
    order.payment_session_id = mockSessionId;
    order.payment_status = 'Pending';
    await order.save();

    const mockResponse = {
      success: true,
      paymentSessionId: mockSessionId,
      cfOrderId: targetOrderId,
      id: targetOrderId,
      order_id: targetOrderId,
      order_amount: rupeeAmount,
      order_currency: currency || 'INR',
      isMock: true,
    };

    console.log('[DEBUG-PAYMENT] Backend Create Cashfree Order MOCK RESPONSE:', mockResponse);
    return res.json(mockResponse);
  }

  try {
    const request = {
      order_amount: rupeeAmount,
      order_currency: currency || 'INR',
      order_id: targetOrderId,
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_phone: order.deliveryDetails.phone || '9999999999',
        customer_email: req.user.email || 'customer@hostelkart.com',
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-success?id=${targetOrderId}&cf_status=redirect`
      }
    };

    console.log('[DEBUG-PAYMENT] Initiating Cashfree API order creation...', request);
    const cashfree = getCashfreeInstance();
    const response = await cashfree.PGCreateOrder(request);
    const cfData = response.data;
    console.log('[DEBUG-PAYMENT] Cashfree PGCreateOrder SUCCESS:', cfData);

    // Store in CashfreeOrder
    await CashfreeOrder.create({
      cfOrderId: targetOrderId,
      paymentSessionId: cfData.payment_session_id,
      amount: cfData.order_amount,
      currency: cfData.order_currency,
      status: 'created',
    });

    // Update main Order
    order.paymentProvider = 'Cashfree';
    order.cf_order_id = targetOrderId;
    order.payment_session_id = cfData.payment_session_id;
    order.payment_status = 'Pending';
    await order.save();

    res.json({
      success: true,
      paymentSessionId: cfData.payment_session_id,
      cfOrderId: targetOrderId,
      id: targetOrderId,
      order_id: targetOrderId,
      order_amount: cfData.order_amount,
      order_currency: cfData.order_currency
    });
  } catch (error) {
    console.error('[DEBUG-PAYMENT] Backend Cashfree Order Creation ERROR:', error.response?.data || error.message);
    res.status(500);
    throw new Error(error.response?.data?.message || 'Cashfree Order Session Creation Failed');
  }
});

// Helper to finalize paid order status, reduce stocks, and trigger notification/email
const handleSuccessfulPayment = async (order, cfOrder) => {
  if (order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID') {
    return;
  }

  console.log('[DEBUG-PAYMENT] handleSuccessfulPayment INITIATED for Order ID:', order._id);

  order.paymentStatus = 'Paid';
  order.payment_status = 'Paid';
  order.paidAt = Date.now();
  order.payment_time = cfOrder.payments?.[0]?.payment_time ? new Date(cfOrder.payments[0].payment_time) : Date.now();
  order.transaction_id = cfOrder.payments?.[0]?.cf_payment_id || '';
  
  await order.save();

  // Deduct product stocks
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // Clear cart for the user
  const cart = await Cart.findOne({ user: order.user });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  // Get user details
  const user = await User.findById(order.user);

  // Send Order Confirmation Email to the Student
  try {
    const studentSubject = `HostelKart Order Confirmation - #${order._id.toString().substring(12).toUpperCase()}`;
    const studentText = `Hello ${user.name},\n\nThank you for shopping at HostelKart!\nYour order has been paid and placed successfully.\n\nOrder Details:\n- Order ID: #${order._id.toString().substring(12).toUpperCase()}\n- Total Amount: ₹${order.totalAmount}\n- Payment Method: ONLINE (Cashfree)\n- Delivery Address: ${order.deliveryDetails.hostelName}, Block ${order.deliveryDetails.block}, Room ${order.deliveryDetails.roomNumber}\n- Delivery Verification OTP: ${order.deliveryOtp}\n\nWe will deliver it to your room floor shortly.\nFor any support, please contact us at supporthostelkart@gmail.com.\n\nBest regards,\nHostelKart Team`;
    
    const studentHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #16a34a;">HostelKart Order Confirmed!</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Thank you for ordering with us. Your order is paid and will be delivered to your hostel room floor in your selected time slot!</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
          <h3 style="margin-top: 0; color: #1e293b;">Order Summary</h3>
          <p><strong>Order ID:</strong> #${order._id.toString().substring(12).toUpperCase()}</p>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
          <p><strong>Payment Method:</strong> ONLINE (Cashfree)</p>
          <p><strong>Delivery Location:</strong> ${order.deliveryDetails.hostelName}, Block ${order.deliveryDetails.block}, Room ${order.deliveryDetails.roomNumber}</p>
          <p style="font-size: 16px;"><strong>Delivery Verification OTP:</strong> <span style="font-size: 18px; font-weight: bold; color: #16a34a; background-color: #dcfce7; padding: 4px 8px; border-radius: 6px;">${order.deliveryOtp}</span></p>
        </div>
        
        <p>If you have any questions, feel free to reply to this email or reach us at <a href="mailto:supporthostelkart@gmail.com">supporthostelkart@gmail.com</a>.</p>
      </div>
    `;
    
    await sendEmail({
      to: user.email,
      subject: studentSubject,
      text: studentText,
      html: studentHtml
    });
  } catch (err) {
    console.error('Failed to send order confirmation email to student:', err.message);
  }

  // Notify Admins
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await createAlert(
      admin._id,
      'New Order Placed',
      `Order #${order._id.toString().substring(12).toUpperCase()} of INR ${order.totalAmount} has been placed by ${user.name}.`,
      'NewOrder'
    );
  }

  console.log('[DEBUG-PAYMENT] handleSuccessfulPayment COMPLETED successfully for Order ID:', order._id);
};

// @desc    Verify Cashfree Payment Status
// @route   POST /api/payments/verify/:id
// @access  Private/Student
const verifyPayment = asyncHandler(async (req, res) => {
  const id = req.params.id || req.body.orderId || req.body.order_id;
  console.log('[DEBUG-PAYMENT] Backend Verify Payment Status REQUEST:', id);

  if (!id) {
    res.status(400);
    throw new Error('Order ID is required');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // If already paid, return early
  if (order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID') {
    return res.json({ success: true, message: 'Payment already verified and paid', order });
  }

  // Handle mock verification for placeholder testing
  if (order.payment_session_id && order.payment_session_id.startsWith('session_mock_')) {
    const mockSuccessOrder = {
      order_status: 'PAID',
      payments: [{
        cf_payment_id: 'pay_mock_' + Math.random().toString(36).substring(2, 11).toUpperCase(),
        payment_status: 'SUCCESS',
        payment_time: new Date().toISOString()
      }]
    };
    await handleSuccessfulPayment(order, mockSuccessOrder);
    return res.json({
      success: true,
      message: 'Mock payment verified successfully',
      order
    });
  }

  try {
    console.log(`[DEBUG-PAYMENT] Fetching order status from Cashfree for Order ID: ${id}...`);
    const cashfree = getCashfreeInstance();
    const response = await cashfree.PGFetchOrder(id);
    const cfOrder = response.data;
    console.log('[DEBUG-PAYMENT] Cashfree PGFetchOrder response data:', cfOrder);

    if (cfOrder.order_status === 'PAID') {
      await handleSuccessfulPayment(order, cfOrder);
      res.json({ success: true, message: 'Payment verified successfully as PAID', order });
    } else {
      console.log(`[DEBUG-PAYMENT] Order not paid yet. Current Cashfree status: ${cfOrder.order_status}`);
      
      // Update local state if failed
      if (['EXPIRED', 'FAILED'].includes(cfOrder.order_status)) {
        order.paymentStatus = 'Failed';
        order.payment_status = 'Failed';
        await order.save();
      }

      res.json({ success: false, message: `Payment status is ${cfOrder.order_status}`, order });
    }
  } catch (error) {
    console.error('[DEBUG-PAYMENT] Backend verifyPayment ERROR:', error.response?.data || error.message);
    res.status(400);
    throw new Error(error.response?.data?.message || 'Payment Verification Failed');
  }
});

// @desc    Cashfree Webhook Handler
// @route   POST /api/payments/webhook
// @access  Public
const handleCashfreeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.rawBody;

  console.log('[DEBUG-PAYMENT] Webhook Received. Headers signature:', signature, 'timestamp:', timestamp);

  if (!signature || !timestamp || !rawBody) {
    console.error('[DEBUG-PAYMENT] Webhook missing required headers or rawBody');
    return res.status(400).send('Missing headers or body');
  }

  // Validate Webhook Signature using SDK built-in handler
  try {
    const cashfree = getCashfreeInstance();
    cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    console.log('[DEBUG-PAYMENT] Webhook signature verified successfully.');
  } catch (error) {
    console.error('[DEBUG-PAYMENT] Webhook signature verification mismatch:', error.message);
    return res.status(400).send('Invalid signature');
  }

  // Signature verified successfully! Parse event body.
  const payload = JSON.parse(rawBody);
  console.log('[DEBUG-PAYMENT] Webhook event verified. Event Type:', payload.type);

  if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK') {
    const cfOrder = payload.data.order;
    const cfPayment = payload.data.payment;
    const orderId = cfOrder.order_id;

    console.log('[DEBUG-PAYMENT] Webhook: Payment Success Event for Order:', orderId, 'Payment ID:', cfPayment.cf_payment_id);

    const order = await Order.findById(orderId);
    if (order) {
      if (order.paymentStatus !== 'Paid' && order.paymentStatus !== 'PAID') {
        await handleSuccessfulPayment(order, {
          order_status: 'PAID',
          payments: [cfPayment]
        });
      } else {
        console.log('[DEBUG-PAYMENT] Webhook: Order already marked Paid, skipping duplicate processing');
      }
    } else {
      console.error('[DEBUG-PAYMENT] Webhook: Order not found in database for ID:', orderId);
    }
  } else if (['PAYMENT_FAILED_WEBHOOK', 'PAYMENT_USER_DROPPED_WEBHOOK'].includes(payload.type)) {
    const orderId = payload.data.order.order_id;
    console.log(`[DEBUG-PAYMENT] Webhook: Payment failed event for Order ID: ${orderId}`);
    
    const order = await Order.findById(orderId);
    if (order && order.paymentStatus === 'Pending') {
      order.paymentStatus = 'Failed';
      order.payment_status = 'Failed';
      await order.save();
    }
  }

  res.status(200).send('OK');
});

// Shared helper function to execute refunds via Cashfree
const refundOrderHelper = async (order, reason) => {
  console.log('[DEBUG-PAYMENT] Backend Refund Helper INITIATED:', { orderId: order._id, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, transactionId: order.transaction_id, reason });

  if (order.paymentMethod !== 'ONLINE') {
    console.warn('[DEBUG-PAYMENT] Backend Refund Helper SKIPPED: Method is not ONLINE');
    return { success: false, message: 'Refund not applicable for payment method: ' + order.paymentMethod };
  }
  if (!['Paid', 'PAID'].includes(order.paymentStatus)) {
    console.warn('[DEBUG-PAYMENT] Backend Refund Helper SKIPPED: Status is not Paid/PAID');
    return { success: false, message: 'Order payment status is not Paid' };
  }
  if (!order.transaction_id) {
    console.warn('[DEBUG-PAYMENT] Backend Refund Helper SKIPPED: Missing transaction_id');
    return { success: false, message: 'Order is missing Cashfree Transaction ID' };
  }

  order.refundStatus = 'PROCESSING';
  order.refundReason = reason || 'Cancelled/Failed Order';
  await order.save();

  // Handle mock simulation for placeholder keys
  if (isPlaceholderKeys() || order.transaction_id.startsWith('pay_mock_')) {
    console.warn(`[Refund Simulation] Simulating successful Cashfree refund for Payment ID: ${order.transaction_id}`);
    
    order.refundStatus = 'REFUNDED';
    order.refundId = `ref_mock_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
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

    return { success: true, refundId: order.refundId, isMock: true };
  }

  try {
    const refundRequest = {
      refund_amount: order.totalAmount,
      refund_id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      refund_note: reason || 'Cancelled/Failed Order',
    };

    console.log('[DEBUG-PAYMENT] Calling Cashfree Refund API...', refundRequest);
    const cashfree = getCashfreeInstance();
    const response = await cashfree.PGOrderCreateRefund(order.cf_order_id || order._id.toString(), refundRequest);
    const cfRefund = response.data;
    console.log('[DEBUG-PAYMENT] Cashfree PGOrderCreateRefund SUCCESS:', cfRefund);

    order.refundStatus = 'REFUNDED';
    order.refundId = cfRefund.refund_id;
    order.refundAmount = cfRefund.refund_amount;
    order.refundedAt = Date.now();
    order.paymentStatus = 'Refunded';
    await order.save();

    // Notify Student
    await createAlert(
      order.user,
      'Refund Successful',
      `Your refund of ₹${order.totalAmount} for Order #${order._id.toString().substring(12).toUpperCase()} has been processed by Cashfree.`,
      'StatusUpdate'
    );

    // Notify Admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createAlert(
        admin._id,
        'Admin Refund Processed',
        `Refund of ₹${order.totalAmount} processed for Order #${order._id.toString().substring(12).toUpperCase()}.`,
        'StatusUpdate'
      );
    }

    return { success: true, refundId: cfRefund.refund_id };
  } catch (error) {
    console.error('[DEBUG-PAYMENT] Backend Refund Helper ERROR:', error.response?.data || error.message);
    order.refundStatus = 'FAILED';
    order.refundError = error.response?.data?.message || error.message;
    await order.save();

    // Notify Student about failure
    await createAlert(
      order.user,
      'Refund Failed',
      `Refund for Order #${order._id.toString().substring(12).toUpperCase()} failed. Our team will resolve it manually.`,
      'StatusUpdate'
    );

    // Notify Admins about failure
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createAlert(
        admin._id,
        'Refund Failure Alert',
        `Refund of ₹${order.totalAmount} failed for Order #${order._id.toString().substring(12).toUpperCase()}. Error: ${order.refundError}`,
        'CancellationAlert'
      );
    }

    return { success: false, message: error.response?.data?.message || error.message };
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
  createCashfreeSession,
  verifyPayment,
  refundOrder,
  refundOrderHelper,
  handleCashfreeWebhook,
};
