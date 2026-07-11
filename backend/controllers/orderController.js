import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { createAlert } from './notificationController.js';
import sendEmail from '../utils/sendEmail.js';
import QRCode from 'qrcode';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Student
const createOrder = asyncHandler(async (req, res) => {
  // Idempotency lock: check if user recently created an order in the last 10s
  const recentOrder = await Order.findOne({
    user: req.user._id,
    createdAt: { $gte: new Date(Date.now() - 10000) }
  });
  if (recentOrder) {
    res.status(400);
    throw new Error('Please wait 10 seconds before placing another order');
  }

  if (req.body.utrNumber) {
    const existingOrder = await Order.findOne({ utrNumber: req.body.utrNumber.trim() });
    if (existingOrder) {
      res.status(400);
      throw new Error('This UTR number has already been used for another order');
    }
  }

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
    couponCode,
    walletPaidAmount = 0,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  if (!deliveryDetails || typeof deliveryDetails !== 'object') {
    res.status(400);
    throw new Error('Delivery details are required');
  }

  const { hostelName, block, floor, roomNumber, phone } = deliveryDetails;
  if (!hostelName || !hostelName.trim() ||
      !block || !block.trim() ||
      !floor || !floor.trim() ||
      !roomNumber || !roomNumber.trim() ||
      !phone || !phone.trim()) {
    res.status(400);
    throw new Error('All required delivery details (hostel, block, floor, room number, phone) must be provided and non-empty');
  }

  // Validate phone format
  if (!/^\+?[1-9]\d{1,14}$/.test(phone.trim()) && !/^\d{10}$/.test(phone.trim())) {
    res.status(400);
    throw new Error('Invalid phone number format in delivery details');
  }

  // Double check stock and adjust stock using a single batch query
  const productIds = orderItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } }).lean();

  const productMap = {};
  products.forEach((p) => {
    productMap[p._id.toString()] = p;
  });

  for (const item of orderItems) {
    const product = productMap[item.product.toString()];
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.name} not found`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}`);
    }
  }

  // Calculate calculations
  const feeVal = platformFee !== undefined ? Number(platformFee) : 15;
  const deliveryVal = deliveryCharge !== undefined ? Number(deliveryCharge) : 0;
  const subtotal = orderItems.reduce((acc, item) => acc + (item.price - (item.discount || 0)) * item.quantity, 0);
  const calculatedTotal = subtotal + feeVal + deliveryVal;

  // Validate and apply Coupon code
  let discountAmount = 0;
  let allowWalletCombination = true;
  if (couponCode) {
    const Coupon = (await import('../models/Coupon.js')).default;
    const couponObj = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!couponObj) {
      res.status(400);
      throw new Error('Invalid coupon code');
    }
    if (!couponObj.active) {
      res.status(400);
      throw new Error('Coupon is inactive');
    }
    if (new Date(couponObj.expiryDate) < new Date()) {
      res.status(400);
      throw new Error('Coupon has expired');
    }
    if (couponObj.usageCount >= couponObj.usageLimit) {
      res.status(400);
      throw new Error('Coupon usage limit reached');
    }
    if (subtotal < couponObj.minimumOrderAmount) {
      res.status(400);
      throw new Error(`Minimum order amount of ₹${couponObj.minimumOrderAmount} required for coupon ${couponObj.code}`);
    }
    if (couponObj.firstOrderOnly) {
      const existingOrdersCount = await Order.countDocuments({
        user: req.user._id,
        orderStatus: { $ne: 'Cancelled' },
      });
      if (existingOrdersCount > 0) {
        res.status(400);
        throw new Error('Coupon is valid for your first order only');
      }
    }

    if (couponObj.discountType === 'percentage') {
      discountAmount = (subtotal * couponObj.discountValue) / 100;
      if (couponObj.maximumDiscount && couponObj.maximumDiscount > 0) {
        discountAmount = Math.min(discountAmount, couponObj.maximumDiscount);
      }
    } else if (couponObj.discountType === 'fixed') {
      discountAmount = couponObj.discountValue;
    }
    discountAmount = Math.min(discountAmount, subtotal);
    allowWalletCombination = couponObj.allowWalletCombination;

    // Increment coupon usage
    couponObj.usageCount += 1;
    await couponObj.save();
  }

  // Validate combination rule
  if (couponCode && !allowWalletCombination && walletPaidAmount > 0) {
    res.status(400);
    throw new Error('This coupon code cannot be combined with wallet balance');
  }

  // Validate Wallet payment cap (max 50% of the total amount)
  let actualWalletPaid = 0;
  if (walletPaidAmount > 0) {
    if (req.user.walletBalance < walletPaidAmount) {
      res.status(400);
      throw new Error('Insufficient wallet balance');
    }
    const maxWalletUsageAllowed = calculatedTotal * 0.5;
    if (walletPaidAmount > maxWalletUsageAllowed + 0.01) {
      res.status(400);
      throw new Error('Wallet balance can be used for a maximum of 50% of the order value');
    }
    actualWalletPaid = walletPaidAmount;
  }

  // Final Payable amount
  const finalTotalAmount = Math.max(0, calculatedTotal - discountAmount - actualWalletPaid);

  // Deduct Wallet amount if any
  if (actualWalletPaid > 0) {
    req.user.walletBalance -= actualWalletPaid;
    await req.user.save();

    const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
    const walletTx = new WalletTransaction({
      user: req.user._id,
      type: 'purchase',
      amount: actualWalletPaid,
      description: `Used wallet balance for order payment`
    });
    await walletTx.save();
  }

  // Generate a random 4-digit delivery OTP
  const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

  // Create order
  const isUpi = paymentMethod === 'UPI';
  const initialPaymentStatus = isUpi ? 'Pending Payment' : (paymentStatus || 'Pending');
  const initialOrderStatus = isUpi ? 'Pending Payment' : 'Pending';
  const expiresAt = isUpi ? new Date(Date.now() + 15 * 60 * 1000) : null;

  const paymentReference = `PAY-HK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const order = new Order({
    user: req.user._id,
    paymentReference,
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
    paymentStatus: initialPaymentStatus,
    orderStatus: initialOrderStatus,
    paymentExpiresAt: expiresAt,
    paidAt: (paymentStatus === 'Paid' || paymentStatus === 'PAID') ? Date.now() : null,
    paymentFailureReason: req.body.paymentFailureReason || '',
    platformFee: feeVal,
    deliveryCharge: deliveryVal,
    totalAmount: finalTotalAmount,
    couponCode: couponCode || '',
    discountAmount: discountAmount,
    walletPaidAmount: actualWalletPaid,
    utrNumber: utrNumber || '',
    paymentProvider: isUpi ? 'UPI' : 'COD',
    deliveryOtp,
    timeline: [
      {
        status: initialOrderStatus,
        note: isUpi ? 'Order created. UPI Payment session started (15m).' : 'Order placed successfully',
      },
    ],
  });

  const createdOrder = await order.save();

  if (paymentMethod === 'COD') {
    // 1. Send Order Confirmation Email to the Student
    try {
      const studentSubject = `HostelKart Order Confirmation - #${createdOrder._id.toString().substring(12).toUpperCase()}`;
      const studentText = `Hello ${req.user.name},\n\nThank you for shopping at HostelKart!\nYour order has been placed successfully.\n\nOrder Details:\n- Order ID: #${createdOrder._id.toString().substring(12).toUpperCase()}\n- Total Amount: ₹${createdOrder.totalAmount}\n- Payment Method: ${createdOrder.paymentMethod}\n- Delivery Address: ${createdOrder.deliveryDetails.hostelName}, Block ${createdOrder.deliveryDetails.block}, Room ${createdOrder.deliveryDetails.roomNumber}\n- Delivery OTP: ${createdOrder.deliveryOtp}\n\nWe will deliver it to your room floor shortly.\nFor any support, please contact us at supporthostelkart@gmail.com.\n\nBest regards,\nHostelKart Team`;
      
      const studentHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #16a34a;">HostelKart Order Confirmed!</h2>
          <p>Hello <strong>${req.user.name}</strong>,</p>
          <p>Thank you for ordering with us. Your order is being processed and will be delivered to your hostel room floor in your selected time slot!</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
            <h3 style="margin-top: 0; color: #1e293b;">Order Summary</h3>
            <p><strong>Order ID:</strong> #${createdOrder._id.toString().substring(12).toUpperCase()}</p>
            <p><strong>Total Amount:</strong> ₹${createdOrder.totalAmount}</p>
            <p><strong>Payment Method:</strong> ${createdOrder.paymentMethod}</p>
            <p><strong>Delivery Location:</strong> ${createdOrder.deliveryDetails.hostelName}, Block ${createdOrder.deliveryDetails.block}, Room ${createdOrder.deliveryDetails.roomNumber}</p>
            <p style="font-size: 16px;"><strong>Delivery Verification OTP:</strong> <span style="font-size: 18px; font-weight: bold; color: #16a34a; background-color: #dcfce7; padding: 4px 8px; border-radius: 6px;">${createdOrder.deliveryOtp}</span></p>
          </div>
          
          <p>If you have any questions, feel free to reply to this email or reach us at <a href="mailto:supporthostelkart@gmail.com">supporthostelkart@gmail.com</a>.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">HostelKart E-commerce Support &bull; Scheduled Delivery to your room block</p>
        </div>
      `;
      
      await sendEmail({
        to: req.user.email,
        subject: studentSubject,
        text: studentText,
        html: studentHtml
      });
    } catch (err) {
      console.error('Failed to send order confirmation email to student:', err.message);
    }

    // 2. Send Order Notification Email to the Admin
    try {
      const adminSubject = `[New Order] - #${createdOrder._id.toString().substring(12).toUpperCase()}`;
      const adminText = `A new order has been placed on HostelKart.\n\nOrder Info:\n- Order ID: #${createdOrder._id.toString().substring(12).toUpperCase()}\n- Total Amount: ₹${createdOrder.totalAmount}\n- Placed By: ${req.user.name} (${req.user.email})\n- Phone: ${createdOrder.deliveryDetails.phone}\n- Address: ${createdOrder.deliveryDetails.hostelName}, Block ${createdOrder.deliveryDetails.block}, Room ${createdOrder.deliveryDetails.roomNumber}\n- Payment: ${createdOrder.paymentMethod} (${createdOrder.paymentStatus})\n\nCheck the Admin Dashboard to assign a delivery rider.`;
      
      const adminHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #1e293b;">New Order Received</h2>
          <p>A new order has been successfully placed by a student.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
            <h3 style="margin-top: 0; color: #1e293b;">Order Details</h3>
            <p><strong>Order ID:</strong> #${createdOrder._id.toString().substring(12).toUpperCase()}</p>
            <p><strong>Total Amount:</strong> ₹${createdOrder.totalAmount}</p>
            <p><strong>Placed By:</strong> ${req.user.name} (${req.user.email})</p>
            <p><strong>Phone:</strong> ${createdOrder.deliveryDetails.phone}</p>
            <p><strong>Delivery Address:</strong> ${createdOrder.deliveryDetails.hostelName}, Block ${createdOrder.deliveryDetails.block}, Room ${createdOrder.deliveryDetails.roomNumber}</p>
            <p><strong>Payment Method:</strong> ${createdOrder.paymentMethod} (${createdOrder.paymentStatus})</p>
          </div>
          
          <p>Please log in to the <a href="https://hostelkart-lessq8nad-shresthsambharias-projects.vercel.app/admin/dashboard">HostelKart Admin Dashboard</a> to manage this order.</p>
        </div>
      `;

      await sendEmail({
        to: 'supporthostelkart@gmail.com',
        subject: adminSubject,
        text: adminText,
        html: adminHtml
      });
    } catch (err) {
      console.error('Failed to send order alert email to admin:', err.message);
    }

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

    // Check for low stock alert using in-memory mapped product states
    for (const item of orderItems) {
      const product = productMap[item.product.toString()];
      if (product && (product.stock - item.quantity) < 10) {
        for (const admin of admins) {
          await createAlert(
            admin._id,
            'Low Stock Alert',
            `Product "${product.name}" is low on stock (${product.stock - item.quantity} left). Please restock soon.`,
            'LowStockAlert'
          );
        }
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

  if (paymentMethod === 'COD' || paymentMethod === 'UPI') {
    // Deduct product stocks using a single high-performance bulkWrite query
    const bulkOps = orderItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: -item.quantity } },
      },
    }));
    await Product.bulkWrite(bulkOps);

    // Clear cart for COD immediately; UPI clears only when UTR is successfully submitted
    if (paymentMethod === 'COD') {
      const cart = await Cart.findOne({ user: req.user._id });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    }
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

  if (
    req.user.role === 'delivery' &&
    (!order.deliveryPartner || order.deliveryPartner._id.toString() !== req.user._id.toString())
  ) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  // Expire order if timer passed
  if (
    order.paymentMethod === 'UPI' &&
    order.paymentStatus === 'Pending Payment' &&
    order.paymentExpiresAt &&
    new Date() > new Date(order.paymentExpiresAt)
  ) {
    order.paymentStatus = 'Failed';
    order.orderStatus = 'Payment Expired';
    order.cancellationReason = 'Payment session expired';
    order.timeline.push({
      status: 'Payment Expired',
      note: 'Payment session expired. Reserved stock released.',
    });

    // Release stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    await order.save();
    
    // Broadcast status update
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('status_updated', {
        orderId: order._id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
      });
    }
  }

  res.json(order);
});

// @desc    Get logged in user orders
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate('items.product').sort({ createdAt: -1 });
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

// @desc    Submit UPI payment details (UTR and screenshot)
// @route   PUT /api/orders/:id/submit-payment
// @access  Private/Student
const submitUPIPayment = asyncHandler(async (req, res) => {
  const { utrNumber, paymentScreenshot, paymentScreenshotHash } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Auth check
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  // Check expiration
  if (order.paymentExpiresAt && new Date() > new Date(order.paymentExpiresAt)) {
    if (order.orderStatus !== 'Payment Expired') {
      order.paymentStatus = 'Failed';
      order.orderStatus = 'Payment Expired';
      order.cancellationReason = 'Payment session expired';
      order.timeline.push({
        status: 'Payment Expired',
        note: 'Payment session expired. Reserved stock released.',
      });
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
      await order.save();
    }
    res.status(400);
    throw new Error('Payment session has expired. Please place a new order.');
  }

  // Prevent duplicate payment submission or already paid orders
  if (['Payment Submitted', 'Pending Verification', 'Paid', 'Verified'].includes(order.paymentStatus)) {
    res.status(400);
    throw new Error('Payment has already been submitted for this order.');
  }

  // Validate UTR format, min/max length, duplicate UTR
  if (!utrNumber || !utrNumber.trim()) {
    res.status(400);
    throw new Error('UTR/Transaction ID is required');
  }

  const cleanedUtr = utrNumber.trim();
  const utrRegex = /^[a-zA-Z0-9]{6,22}$/;
  if (!utrRegex.test(cleanedUtr)) {
    res.status(400);
    throw new Error('UTR Number must be alphanumeric and between 6 and 22 characters.');
  }

  const duplicateUtr = await Order.findOne({ utrNumber: cleanedUtr });
  if (duplicateUtr && duplicateUtr._id.toString() !== order._id.toString()) {
    res.status(400);
    throw new Error('This UTR Number has already been submitted for another order.');
  }

  // Update order details
  order.utrNumber = cleanedUtr;
  order.paymentScreenshot = paymentScreenshot || '';
  order.paymentScreenshotHash = paymentScreenshotHash || '';
  order.paymentStatus = 'Payment Submitted';
  order.orderStatus = 'Payment Submitted';
  order.paymentSubmittedAt = Date.now();
  
  order.timeline.push({
    status: 'Payment Submitted',
    note: `Payment details submitted. UTR: ${cleanedUtr}. Awaiting verification.`,
  });

  const updatedOrder = await order.save();

  // Clear cart only on successful payment submission
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  // Notify admins
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await createAlert(
      admin._id,
      'Payment Submitted',
      `Payment submitted for Order #${order._id.toString().substring(12).toUpperCase()} by student ${req.user.name}.`,
      'NewOrder'
    );
  }

  // Broadcast socket update
  const io = req.app.get('io');
  if (io) {
    io.to(`order_${order._id}`).emit('status_updated', {
      orderId: order._id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
    });
  }

  res.json(updatedOrder);
});

// @desc    Generate dynamic UPI QR Code PNG
// @route   GET /api/orders/:id/qr-code
// @access  Public
const getOrderQRCode = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const upiId = 'rawlanineev@okhdfcbank';
  const merchantName = 'Neev Rawlani';
  const amount = order.totalAmount.toFixed(2);
  const orderNum = order._id.toString().substring(12).toUpperCase();
  const note = `Order #${orderNum}`;

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tr=${order._id.toString()}&tn=${encodeURIComponent(note)}`;

  try {
    res.setHeader('Content-Type', 'image/png');
    QRCode.toFileStream(res, upiUrl);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

// @desc    Get current user online payment history
// @route   GET /api/orders/payment-history
// @access  Private/Student
const getPaymentHistory = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    user: req.user._id,
    paymentMethod: 'UPI'
  })
    .sort({ createdAt: -1 })
    .select('_id totalAmount paymentMethod utrNumber paymentStatus orderStatus refunds createdAt');
  
  res.json(orders);
});

export {
  createOrder,
  getOrderById,
  getMyOrders,
  getPaymentSettingsForCheckout,
  cancelOrder,
  submitUPIPayment,
  getOrderQRCode,
  getPaymentHistory,
};
