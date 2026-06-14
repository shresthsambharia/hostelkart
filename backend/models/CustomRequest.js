import mongoose from 'mongoose';

const customRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    estimatedPrice: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
    adminFeedback: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const CustomRequest = mongoose.model('CustomRequest', customRequestSchema);

export default CustomRequest;
