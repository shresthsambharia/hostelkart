import mongoose from 'mongoose';

const adjustmentItemSchema = new mongoose.Schema(
  {
    type: { type: String, default: 'FEE' },
    amount: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const supplierPayoutSchema = new mongoose.Schema(
  {
    payoutNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    orderItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    settlementPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    grossAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    commissionAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    adjustments: [adjustmentItemSchema],
    adjustmentsTotal: {
      type: Number,
      default: 0,
    },
    netPayable: {
      type: Number,
      required: true,
      default: 0,
    },
    payoutAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Eligible', 'Approved', 'Processing', 'Settled', 'Paid', 'Failed', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    payoutDay: {
      type: String,
      default: 'Saturday',
    },
    dueAt: {
      type: Date,
      default: null,
    },
    isOverdue: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      default: 'UPI QR',
    },
    bankDetailsSnapshot: {
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      upiId: { type: String, default: '' },
      upiQrCode: { type: String, default: '' },
    },
    utrNumber: {
      type: String,
      default: '',
    },
    payoutProofUrl: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    adminNote: {
      type: String,
      default: '',
    },
    failureReason: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

supplierPayoutSchema.index({ supplier: 1, status: 1 });
supplierPayoutSchema.index({ createdAt: -1 });

const SupplierPayout = mongoose.model('SupplierPayout', supplierPayoutSchema);

export default SupplierPayout;
