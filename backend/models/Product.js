import mongoose from 'mongoose';

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      required: true,
      default: 0, // In percentage, e.g. 10 for 10%
    },
    category: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
    reviews: [reviewSchema],
    deliveryTime: {
      type: String,
      required: true,
      default: '30 mins',
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimization
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1, numReviews: -1 });
productSchema.index({ name: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;
export { reviewSchema };
