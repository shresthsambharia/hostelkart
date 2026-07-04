import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, required: true, default: 0 },
});

const timelineSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const refundSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  internalNotes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Refunded', 'Rejected'],
    default: 'Pending',
  },
  refundDate: { type: Date, default: Date.now },
  refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    deliveryDetails: {
      hostelName: { type: String, required: true },
      block: { type: String, required: true },
      floor: { type: String, required: true },
      roomNumber: { type: String, required: true },
      phone: { type: String, required: true },
      alternatePhone: { type: String, default: '' },
      landmark: { type: String, default: '' },
      deliveryInstructions: { type: String, default: '' },
    },
    deliverySlot: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        'Pending', 'Paid', 'Failed', 'Verification Pending', 'Pending Verification', 
        'Payment Pending Verification', 'Pending Payment', 'Rejected', 'Refunded', 
        'PAID', 'FAILED', 'Payment Submitted', 'Refund Pending', 'Payment Expired'
      ],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: [
        'Pending', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered', 
        'Cancelled', 'Delivery Failed', 'Pending Payment', 'Payment Pending Verification', 
        'Paid', 'Rejected', 'Payment Submitted', 'Pending Verification', 
        'Refund Pending', 'Refunded', 'Payment Expired'
      ],
      default: 'Pending',
    },
    platformFee: {
      type: Number,
      required: true,
      default: 15.0,
    },
    deliveryCharge: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0.0,
    },
    couponCode: {
      type: String,
      default: '',
    },
    discountAmount: {
      type: Number,
      default: 0.0,
    },
    walletPaidAmount: {
      type: Number,
      default: 0.0,
    },
    cashbackAmount: {
      type: Number,
      default: 0.0,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    utrNumber: {
      type: String,
      default: '',
    },
    paymentExpiresAt: {
      type: Date,
    },
    paymentScreenshot: {
      type: String,
      default: '',
    },
    paymentScreenshotHash: {
      type: String,
      default: '',
    },
    paymentProvider: {
      type: String,
      default: 'COD',
    },
    cf_order_id: {
      type: String,
      default: '',
    },
    payment_session_id: {
      type: String,
      default: '',
    },
    transaction_id: {
      type: String,
      default: '',
    },
    payment_status: {
      type: String,
      default: 'Pending',
    },
    payment_time: {
      type: Date,
    },
    refundStatus: {
      type: String,
      enum: ['NOT_REQUESTED', 'PROCESSING', 'REFUNDED', 'FAILED', 'PARTIAL_REFUNDED'],
      default: 'NOT_REQUESTED',
    },
    refundId: {
      type: String,
      default: '',
    },
    refundAmount: {
      type: Number,
      default: 0.0,
    },
    refundReason: {
      type: String,
      default: '',
    },
    refundedAt: {
      type: Date,
    },
    refundError: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
    },
    paymentFailureReason: {
      type: String,
      default: '',
    },
    deliveryOtp: {
      type: String,
      default: '',
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    timeline: [timelineSchema],
    refunds: [refundSchema],
  },
  {
    timestamps: true,
  }
);

orderSchema.pre('save', async function (next) {
  if (this.isModified('orderStatus')) {
    const status = this.orderStatus;
    
    try {
      const { sendPushNotification } = await import('../utils/fcm.js');
      let title = '';
      let message = '';
      
      if (status === 'Confirmed') {
        title = 'Order Confirmed';
        message = `Your order #${this._id.toString().substring(12).toUpperCase()} has been confirmed and is being processed.`;
      } else if (status === 'Packed') {
        title = 'Order Prepared';
        message = `Your order #${this._id.toString().substring(12).toUpperCase()} has been packed and is ready for pickup.`;
      } else if (status === 'Out for Delivery') {
        title = 'Order Out for Delivery';
        message = `Your order #${this._id.toString().substring(12).toUpperCase()} is out for delivery! A rider is heading to your room.`;
      } else if (status === 'Delivered') {
        title = 'Order Delivered';
        message = `Your order #${this._id.toString().substring(12).toUpperCase()} was successfully delivered to your room.`;
      }
      
      if (title && message) {
        // Run push notification
        sendPushNotification(this.user, title, message, 'StatusUpdate').catch(console.error);
      }
    } catch (fcmErr) {
      console.error('FCM error in order status pre-save:', fcmErr);
    }
  }

  // Handle Delivered status processing
  if (this.isModified('orderStatus') && this.orderStatus === 'Delivered') {
    const User = mongoose.model('User');
    const WalletTransaction = mongoose.model('WalletTransaction');
    
    try {
      const userObj = await User.findById(this.user);
      if (userObj) {
        // Count previous delivered orders
        const OrderModel = mongoose.model('Order');
        const deliveredOrdersCount = await OrderModel.countDocuments({
          user: this.user,
          orderStatus: 'Delivered',
          _id: { $ne: this._id }
        });
        
        // Determine cashback percent:
        // Bronze: 0-4 orders (1%)
        // Silver: 5-14 orders (2%)
        // Gold: 15-29 orders (3%)
        // Platinum: 30+ orders (5%)
        let cashbackPercent = 1;
        let loyaltyLevel = 'Bronze';
        if (deliveredOrdersCount >= 30) {
          cashbackPercent = 5;
          loyaltyLevel = 'Platinum';
        } else if (deliveredOrdersCount >= 15) {
          cashbackPercent = 3;
          loyaltyLevel = 'Gold';
        } else if (deliveredOrdersCount >= 5) {
          cashbackPercent = 2;
          loyaltyLevel = 'Silver';
        }
        
        const cashbackAmount = Math.round((this.totalAmount * cashbackPercent) / 100);
        this.cashbackAmount = cashbackAmount;
        
        if (cashbackAmount > 0) {
          userObj.walletBalance += cashbackAmount;
          
          const cashbackTx = new WalletTransaction({
            user: this.user,
            type: 'cashback',
            amount: cashbackAmount,
            description: `Cashback earned on order #${this._id.toString().substring(12).toUpperCase()} (${loyaltyLevel} Tier)`
          });
          await cashbackTx.save();
        }
        
        userObj.loyaltyLevel = loyaltyLevel;
        await userObj.save();
        
        // Referral reward processing ( ₹50 cashback only on invitee's first delivered order )
        if (userObj.referredBy && !userObj.referralRewardClaimed) {
          if (deliveredOrdersCount === 0) {
            const referrer = await User.findById(userObj.referredBy);
            if (referrer) {
              // Credit ₹50 to referee
              userObj.walletBalance += 50;
              const refereeTx = new WalletTransaction({
                user: userObj._id,
                type: 'referral',
                amount: 50,
                description: `Referral signup cashback (referred by ${referrer.name})`
              });
              await refereeTx.save();
              
              // Credit ₹50 to referrer
              referrer.walletBalance += 50;
              referrer.referralsCount += 1;
              const referrerTx = new WalletTransaction({
                user: referrer._id,
                type: 'referral',
                amount: 50,
                description: `Referral referral cashback (referred user ${userObj.name} delivered first order)`
              });
              await referrerTx.save();
              await referrer.save();
              
              userObj.referralRewardClaimed = true;
              await userObj.save();
              
              const { sendPushNotification } = await import('../utils/fcm.js');
              await sendPushNotification(userObj._id, '₹50 Referral Cashback Credited!', `Your first order was delivered! You and your referrer both earned ₹50 cashback.`, 'Cashback');
              await sendPushNotification(referrer._id, '₹50 Referral Cashback Credited!', `Your invitee ${userObj.name} just completed their first order. You earned ₹50 cashback!`, 'Cashback');
            }
          }
        }
        
        if (cashbackAmount > 0) {
          const { sendPushNotification } = await import('../utils/fcm.js');
          await sendPushNotification(userObj._id, 'Cashback Credited!', `You earned ₹${cashbackAmount} cashback on order #${this._id.toString().substring(12).toUpperCase()}!`, 'Cashback');
        }
      }
    } catch (err) {
      console.error('Error in Order pre-save hook for Delivered state:', err);
    }
  }
  next();
});

// Indexes for query optimization
orderSchema.index({ user: 1, orderStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deliveryPartner: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
