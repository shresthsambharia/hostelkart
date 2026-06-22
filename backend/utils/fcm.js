import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Simulates sending an FCM Push Notification.
 * It writes a status message to the console and logs the notification in the user's notifications collection in MongoDB.
 */
export const sendPushNotification = async (userId, title, message, type = 'StatusUpdate') => {
  try {
    console.log(`[MOCK FCM PUSH] User: ${userId} | Title: "${title}" | Message: "${message}" | Type: ${type}`);

    const user = await User.findById(userId);
    if (user && user.fcmToken) {
      console.log(`[MOCK FCM SUCCESS] Target Device Token: ${user.fcmToken}`);
    }

    // Write to Notification database collection so students see it in their alerts list
    const notification = new Notification({
      recipient: userId,
      title,
      message,
      type,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error in sendPushNotification helper:', error);
  }
};
