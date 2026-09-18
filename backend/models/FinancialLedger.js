import mongoose from 'mongoose';

const financialLedgerSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    payout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplierPayout',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['SALE', 'COMMISSION', 'REFUND', 'ADJUSTMENT', 'PAYOUT'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    direction: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    reference: {
      type: String,
      default: '',
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

financialLedgerSchema.index({ supplier: 1, createdAt: -1 });
financialLedgerSchema.index({ type: 1, createdAt: -1 });

const FinancialLedger = mongoose.model('FinancialLedger', financialLedgerSchema);

export default FinancialLedger;
