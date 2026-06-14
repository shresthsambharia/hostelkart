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
  note: { type: String, default: '' },
});

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
      enum: ['Pending', 'Paid', 'Failed', 'Verification Pending', 'Refunded', 'PAID', 'FAILED'],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Delivery Failed'],
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
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    utrNumber: {
      type: String,
      default: '',
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    razorpaySignature: {
      type: String,
      default: '',
    },
    refundStatus: {
      type: String,
      enum: ['NOT_REQUESTED', 'PROCESSING', 'REFUNDED', 'FAILED'],
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
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
