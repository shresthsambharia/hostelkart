import mongoose from 'mongoose';

const supplierOnboardingPaymentSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 40,
    },
    amountPaise: {
      type: Number,
      required: true,
      default: 4000,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      default: 'UPI QR',
    },
    utr: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index to ensure efficient lookup and duplicate protection
supplierOnboardingPaymentSchema.index({ supplier: 1, status: 1 });
supplierOnboardingPaymentSchema.index({ utr: 1 });

const SupplierOnboardingPayment = mongoose.model(
  'SupplierOnboardingPayment',
  supplierOnboardingPaymentSchema
);

export default SupplierOnboardingPayment;
