import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    vehicleNumber: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'On Delivery'],
      default: 'Active',
    },
    currentOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

export default DeliveryPartner;
