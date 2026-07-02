import mongoose from 'mongoose';

const cashfreeOrderSchema = new mongoose.Schema(
  {
    cfOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentSessionId: {
      type: String,
      required: true,
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
      default: 'created', // created, paid, failed
    },
  },
  {
    timestamps: true,
  }
);

const CashfreeOrder = mongoose.model('CashfreeOrder', cashfreeOrderSchema);
export default CashfreeOrder;
