import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ['fixed', 'percentage', 'free_delivery'],
    },
    discountValue: {
      type: Number,
      required: true,
      default: 0,
    },
    minimumOrderAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    maximumDiscount: {
      type: Number,
      required: true,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      required: true,
      default: 100,
    },
    usageCount: {
      type: Number,
      required: true,
      default: 0,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    firstOrderOnly: {
      type: Boolean,
      required: true,
      default: false,
    },
    allowWalletCombination: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
