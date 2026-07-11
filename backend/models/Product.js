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
      default: 'Scheduled Delivery',
    },
    brand: {
      type: String,
      default: '',
    },
    mrp: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },
    imageOriginal: {
      type: String,
    },
    imageMedium: {
      type: String,
    },
    imageThumb: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to populate optimized variants
productSchema.pre('save', function (next) {
  if (this.isModified('image') || !this.imageOriginal) {
    const imgUrl = this.image;
    if (imgUrl && imgUrl.startsWith('https://images.unsplash.com')) {
      const baseUrl = imgUrl.split('?')[0];
      this.imageOriginal = `${baseUrl}?auto=format&fit=crop&q=80`;
      this.imageMedium = `${baseUrl}?w=300&fit=crop&q=70&auto=format`;
      this.imageThumb = `${baseUrl}?w=100&fit=crop&q=70&auto=format`;
    } else if (imgUrl && imgUrl.includes('-medium.webp')) {
      const baseName = imgUrl.replace('-medium.webp', '');
      this.imageOriginal = `${baseName}-original.webp`;
      this.imageMedium = `${baseName}-medium.webp`;
      this.imageThumb = `${baseName}-thumb.webp`;
    } else {
      this.imageOriginal = imgUrl;
      this.imageMedium = imgUrl;
      this.imageThumb = imgUrl;
    }
  }
  next();
});

// Indexes for optimization
productSchema.index({ price: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ rating: -1, numReviews: -1 });
productSchema.index({ name: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;
export { reviewSchema };
