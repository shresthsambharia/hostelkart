import mongoose from 'mongoose';

const razorpayOrderSchema = new mongoose.Schema(
  {
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
    },
    status: {
      type: String,
      default: 'created',
    },
  },
  {
    timestamps: true,
  }
);

const RazorpayOrder = mongoose.model('RazorpayOrder', razorpayOrderSchema);
export default RazorpayOrder;
