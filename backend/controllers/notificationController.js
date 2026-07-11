import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import { getIoInstance } from '../utils/socket.js';
import * as emailTemplates from '../utils/emailTemplates.js';

// @desc    Get all notifications for logged-in user with pagination/search/filters
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = { recipient: req.user._id };

  if (req.query.isRead !== undefined) {
    query.isRead = req.query.isRead === 'true';
  }

  if (req.query.type) {
    query.type = req.query.type;
  }

  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { message: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const sortDirection = req.query.sort === 'oldest' ? 1 : -1;

  const total = await Notification.countDocuments(query);
  const notifications = await Notification.find(query)
    .sort({ createdAt: sortDirection })
    .skip(skip)
    .limit(limit)
    .lean();

  res.json({
    notifications,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (notification) {
    notification.isRead = true;
    const updated = await notification.save();
    res.json(updated);
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
});

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );
  res.json({ message: 'All notifications marked as read' });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id
  });

  if (notification) {
    await Notification.deleteOne({ _id: notification._id });
    res.json({ message: 'Notification deleted successfully' });
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
});

// @desc    Get user notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
const getNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences').lean();
  res.json(user.notificationPreferences || {
    email: true,
    inApp: true,
    orderUpdates: true,
    paymentUpdates: true,
    promotions: true,
    securityAlerts: true
  });
});

// @desc    Update user notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.notificationPreferences = {
      email: req.body.email !== undefined ? req.body.email : (user.notificationPreferences?.email ?? true),
      inApp: req.body.inApp !== undefined ? req.body.inApp : (user.notificationPreferences?.inApp ?? true),
      orderUpdates: req.body.orderUpdates !== undefined ? req.body.orderUpdates : (user.notificationPreferences?.orderUpdates ?? true),
      paymentUpdates: req.body.paymentUpdates !== undefined ? req.body.paymentUpdates : (user.notificationPreferences?.paymentUpdates ?? true),
      promotions: req.body.promotions !== undefined ? req.body.promotions : (user.notificationPreferences?.promotions ?? true),
      securityAlerts: req.body.securityAlerts !== undefined ? req.body.securityAlerts : (user.notificationPreferences?.securityAlerts ?? true),
    };

    const updatedUser = await user.save();
    res.json(updatedUser.notificationPreferences);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// Programmatic helper to create database notifications, send email, and trigger Socket broadcasts
const createAlert = async (recipientId, title, message, type) => {
  try {
    const user = await User.findById(recipientId);
    if (!user) return;

    const prefs = user.notificationPreferences || {
      email: true,
      inApp: true,
      orderUpdates: true,
      paymentUpdates: true,
      promotions: true,
      securityAlerts: true
    };

    let categoryEnabled = true;
    if (['StatusUpdate', 'AssignedOrder', 'OrderPrepared', 'RiderAssigned'].includes(type)) {
      categoryEnabled = prefs.orderUpdates;
    } else if (['NewOrder', 'PaymentSubmitted', 'PaymentApproved', 'PaymentRejected', 'RefundCompleted', 'RefundApproved'].includes(type)) {
      categoryEnabled = prefs.paymentUpdates;
    } else if (['Promo'].includes(type)) {
      categoryEnabled = prefs.promotions;
    } else if (['SecurityAlert', 'SuspiciousLogin', 'AccountLockout'].includes(type)) {
      categoryEnabled = prefs.securityAlerts;
    }

    if (!categoryEnabled) return;

    if (prefs.inApp) {
      await Notification.create({
        recipient: recipientId,
        title,
        message,
        type,
      });

      const io = getIoInstance();
      if (io) {
        io.to(`user_${recipientId.toString()}`).emit('new_notification', {
          title,
          message,
          type,
          createdAt: new Date(),
        });
      }
    }

    if (prefs.email && user.email) {
      let html = '';
      if (type === 'StatusUpdate' && title.includes('Confirmed')) {
        html = emailTemplates.getOrderConfirmationEmail('', '', '', '', {});
      } else if (type === 'StatusUpdate' && title.includes('Delivered')) {
        html = emailTemplates.getOrderDeliveredEmail('');
      } else if (type === 'SecurityAlert') {
        html = emailTemplates.getSecurityAlertEmail(user.name, title, message);
      } else {
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
              <h1 style="color: #16a34a; margin: 0;">HostelKart</h1>
            </div>
            <div style="padding: 20px 0;">
              <h2 style="color: #1e293b;">${title}</h2>
              <p>${message}</p>
            </div>
          </div>
        `;
      }

      await sendEmail({
        to: user.email,
        subject: `HostelKart Notification: ${title}`,
        text: message,
        html,
      });
    }
  } catch (error) {
    console.error('Failed to register programmatic notification alert:', error);
  }
};

export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  createAlert
};
