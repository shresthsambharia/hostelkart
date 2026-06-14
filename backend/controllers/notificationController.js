import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(55);
  res.json(notifications);
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

// Programmatic helper to create database notifications
const createAlert = async (recipientId, title, message, type) => {
  try {
    await Notification.create({
      recipient: recipientId,
      title,
      message,
      type,
    });
  } catch (error) {
    console.error('Failed to register programmatic notification alert:', error);
  }
};

export { getNotifications, markAsRead, markAllAsRead, createAlert };
