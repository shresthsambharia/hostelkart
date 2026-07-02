import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { createAlert } from './notificationController.js';
import { refundOrderHelper } from './paymentController.js';

// @desc    Get assigned orders for delivery partner
// @route   GET /api/delivery/orders
// @access  Private/Delivery
const getAssignedOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    deliveryPartner: req.user._id,
    orderStatus: { $in: ['Confirmed', 'Packed', 'Out for Delivery'] },
  })
    .populate('user', 'name email phone hostelDetails')
    .populate('items.product', 'image imageOriginal imageMedium imageThumb')
    .sort({ createdAt: -1 });

  res.json(orders);
});

// @desc    Update delivery order status (Packed, Out for Delivery, Delivered)
// @route   PUT /api/delivery/orders/:id/status
// @access  Private/Delivery
const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    // Check authorization
    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this order');
    }

    order.orderStatus = status;
    order.timeline.push({
      status,
      note: note || `Order status updated to ${status} by delivery partner`,
    });

    if (status === 'Delivered') {
      const { otp } = req.body;
      if (!otp) {
        res.status(400);
        throw new Error('Delivery OTP is required to deliver order');
      }
      if (order.deliveryOtp !== otp.trim()) {
        res.status(400);
        throw new Error('Invalid OTP');
      }
      order.otpVerified = true;
      order.deliveredAt = Date.now();
      if (order.paymentMethod === 'COD') {
        order.paymentStatus = 'Paid';
      }
    } else if (status === 'Cancelled' || status === 'Delivery Failed') {
      order.paymentStatus = (status === 'Delivery Failed' && ['ONLINE', 'CASHFREE'].includes(order.paymentMethod) && ['Paid', 'PAID'].includes(order.paymentStatus)) ? 'Paid' : 'Failed';
      order.cancelledAt = Date.now();
      order.cancellationReason = note || 'Delivery failed';

      // Restock products on cancellation/failure
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }

      // Auto-refund for online paid orders on delivery failure
      if (status === 'Delivery Failed' && ['ONLINE', 'CASHFREE'].includes(order.paymentMethod) && ['Paid', 'PAID'].includes(order.paymentStatus)) {
        await refundOrderHelper(order, `Delivery Failed: ${order.cancellationReason}`);
      }
    }
    await order.save();

    // Broadcast status update in real-time via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id.toString()}`).emit('status_updated', {
        orderId: order._id.toString(),
        status,
        note: note || `Order status updated to ${status} by delivery partner`
      });
    }

    // Trigger notification alerts
    if (status === 'Delivered') {
      await createAlert(
        order.user,
        'Order Delivered',
        `Your order #${order._id.toString().substring(12).toUpperCase()} has been successfully delivered to your room by rider ${req.user.name}.`,
        'StatusUpdate'
      );
      
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createAlert(
          admin._id,
          'Delivery Completed',
          `Order #${order._id.toString().substring(12).toUpperCase()} has been delivered and verified via OTP by rider ${req.user.name}.`,
          'StatusUpdate'
        );
      }
    } else if (status === 'Cancelled' || status === 'Delivery Failed') {
      await createAlert(
        order.user,
        'Delivery Failed',
        `Delivery for your order #${order._id.toString().substring(12).toUpperCase()} failed. Reason: "${order.cancellationReason}"`,
        'StatusUpdate'
      );
      
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createAlert(
          admin._id,
          'Delivery Failed Alert',
          `Rider ${req.user.name} reported delivery failure for Order #${order._id.toString().substring(12).toUpperCase()}. Reason: "${order.cancellationReason}"`,
          'CancellationAlert'
        );
      }
    }

    // Sync delivery partner status
    const partnerDetails = await DeliveryPartner.findOne({ user: req.user._id });
    if (partnerDetails) {
      if (status === 'Delivered' || status === 'Cancelled' || status === 'Delivery Failed') {
        // Remove from active currentOrders list
        partnerDetails.currentOrders = partnerDetails.currentOrders.filter(
          (oId) => oId.toString() !== order._id.toString()
        );
        partnerDetails.status = partnerDetails.currentOrders.length > 0 ? 'On Delivery' : 'Active';
      } else {
        partnerDetails.status = 'On Delivery';
      }
      await partnerDetails.save();
    }

    res.json({ message: 'Delivery status updated successfully', order });
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get delivery history for delivery partner
// @route   GET /api/delivery/history
// @access  Private/Delivery
const getDeliveryHistory = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    deliveryPartner: req.user._id,
    orderStatus: { $in: ['Delivered', 'Cancelled'] },
  })
    .populate('user', 'name email phone')
    .populate('items.product', 'image imageOriginal imageMedium imageThumb')
    .sort({ updatedAt: -1 });

  res.json(orders);
});

export { getAssignedOrders, updateDeliveryStatus, getDeliveryHistory };
