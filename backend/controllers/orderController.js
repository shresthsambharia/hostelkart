import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { createAlert } from './notificationController.js';
import { refundOrderHelper } from './paymentController.js';
import sendEmail from '../utils/sendEmail.js';

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

  // 1. Send Order Confirmation Email to the Student
  try {
    const studentSubject = `HostelKart Order Confirmation - #${createdOrder._id.toString().substring(12).toUpperCase()}`;
    const studentText = `Hello ${req.user.name},\n\nThank you for shopping at HostelKart!\nYour order has been placed successfully.\n\nOrder Details:\n- Order ID: #${createdOrder._id.toString().substring(12).toUpperCase()}\n- Total Amount: ₹${createdOrder.totalAmount}\n- Payment Method: ${createdOrder.paymentMethod}\n- Delivery Address: ${createdOrder.deliveryDetails.hostelName}, Block ${createdOrder.deliveryDetails.block}, Room ${createdOrder.deliveryDetails.roomNumber}\n- Delivery OTP: ${createdOrder.deliveryOtp}\n\nWe will deliver it to your room floor shortly.\nFor any support, please contact us at supporthostelkart@gmail.com.\n\nBest regards,\nHostelKart Team`;
    
    const studentHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #16a34a;">HostelKart Order Confirmed!</h2>
        <p>Hello <strong>${req.user.name}</strong>,</p>
        <p>Thank you for ordering with us. Your order is being processed and will be delivered to your hostel room floor in under 30 minutes!</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
          <h3 style="margin-top: 0; color: #1e293b;">Order Summary</h3>
          <p><strong>Order ID:</strong> #${createdOrder._id.toString().substring(12).toUpperCase()}</p>
          <p><strong>Total Amount:</strong> ₹${createdOrder.totalAmount}</p>
          <p><strong>Payment Method:</strong> ${createdOrder.paymentMethod}</p>
          <p><strong>Delivery Location:</strong> ${createdOrder.deliveryDetails.hostelName}, Block ${createdOrder.deliveryDetails.block}, Room ${createdOrder.deliveryDetails.roomNumber}</p>
          <p style="font-size: 16px;"><strong>Delivery Verification OTP:</strong> <span style="font-size: 18px; font-weight: bold; color: #16a34a; background-color: #dcfce7; padding: 4px 8px; border-radius: 6px;">${createdOrder.deliveryOtp}</span></p>
        </div>
        
        <p>If you have any questions, feel free to reply to this email or reach us at <a href="mailto:supporthostelkart@gmail.com">supporthostelkart@gmail.com</a>.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">HostelKart E-commerce Support &bull; Delivery to your room block in 30 minutes</p>
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
