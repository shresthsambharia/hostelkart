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
    if (imgUrl && imgUrl.includes('res.cloudinary.com')) {
      const parts = imgUrl.split('image/upload/');
      if (parts.length === 2) {
        const cleanPath = parts[1].replace(/^w_\d+,f_auto,q_auto,dpr_auto,c_fill,g_auto,fl_progressive\//, '');
        this.imageOriginal = `${parts[0]}image/upload/w_1080,f_auto,q_auto,dpr_auto,c_fill,g_auto,fl_progressive/${cleanPath}`;
        this.imageMedium = `${parts[0]}image/upload/w_512,f_auto,q_auto,dpr_auto,c_fill,g_auto,fl_progressive/${cleanPath}`;
        this.imageThumb = `${parts[0]}image/upload/w_256,f_auto,q_auto,dpr_auto,c_fill,g_auto,fl_progressive/${cleanPath}`;
      } else {
        this.imageOriginal = imgUrl;
        this.imageMedium = imgUrl;
        this.imageThumb = imgUrl;
      }
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
