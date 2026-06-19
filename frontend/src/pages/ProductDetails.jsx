import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { productAPI } from '../api';
import { Star, ShoppingCart, Heart, ArrowLeft, Clock, ShieldCheck, RefreshCcw } from 'lucide-react';

const ProductDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Review form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const fetchProductDetails = async () => {
    try {
      const { data } = await productAPI.getById(id);
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Product Not Found</h2>
        <p className="text-slate-500">The product you are looking for does not exist or has been removed.</p>
        <Link to="/products" className="btn-primary py-3 px-6 inline-flex items-center justify-center min-h-[48px]">Back to Shop</Link>
      </div>
    );
  }

  const isFavorited = isInWishlist(product._id);
  const discountedPrice = Math.round(
    product.price - (product.price * (product.discount || 0)) / 100
  );

  const handleQtyChange = (type) => {
    if (type === 'inc' && quantity < product.stock) {
      setQuantity(quantity + 1);
    } else if (type === 'dec' && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCartSubmit = async () => {
    setAddingToCart(true);
    setErrorMsg('');
    const res = await addToCart(product._id, quantity);
    if (!res.success) {
      setErrorMsg(res.message);
    } else {
      // Alert/notification banner could be shown here
    }
    setAddingToCart(false);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (!comment.trim()) {
      setReviewError('Please write a comment');
      return;
    }

    try {
      await productAPI.submitReview(product._id, { rating, comment });
      setReviewSuccess('Review submitted successfully!');
      setComment('');
      setRating(5);
      // Reload product details to show new review
      fetchProductDetails();
    } catch (error) {
      setReviewError(error.response?.data?.message || 'Failed to submit review');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Back button */}
      <div>
        <Link to="/products" className="inline-flex items-center space-x-2 text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">
          <ArrowLeft size={16} />
          <span>Back to products</span>
        </Link>
      </div>

      {/* Main product card */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Product Image Panel */}
          <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-center min-h-[300px] md:min-h-[400px] relative">
            <img
              src={
                product.image
                  ? (product.image.startsWith('https://images.unsplash.com') && !product.image.includes('w=')
                      ? `${product.image}${product.image.includes('?') ? '&' : '?'}w=600&q=80`
                      : product.image)
                  : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80'
              }
              alt={product.name}
              loading="lazy"
              className="w-full h-full max-h-[350px] object-contain rounded-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80';
              }}
            />
            {product.discount > 0 && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase shadow-sm">
                {product.discount}% OFF
              </span>
            )}
          </div>

          {/* Product Specifications & Order controls */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold uppercase rounded-lg">
                {product.category}
              </span>
              
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Rating stars & review count summary */}
              <div className="flex items-center space-x-2">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${i < Math.round(product.rating) ? 'fill-current' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {product.rating.toFixed(1)} / 5.0
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-sm text-slate-500 font-medium">
                  {product.numReviews} student reviews
                </span>
              </div>

              {/* Pricing section */}
              <div className="flex items-baseline space-x-3 border-y border-slate-100 py-3">
                <span className="text-3xl font-extrabold text-slate-900">₹{discountedPrice}</span>
                {product.discount > 0 && (
                  <span className="text-base text-slate-400 line-through">₹{product.price}</span>
                )}
              </div>

              {/* Description */}
              <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
            </div>

            {/* Availability details & actions */}
            <div className="space-y-4 pt-4">
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Clock size={16} className="text-primary-600" />
                  <span>Delivery time: {product.deliveryTime}</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <ShieldCheck size={16} className="text-primary-600" />
                  <span>Campus Quality Guaranteed</span>
                </div>
              </div>

              {/* Stock check */}
              <div className="flex items-center space-x-4">
                <span className="text-sm font-semibold text-slate-700">Stock Availability:</span>
                {product.stock > 0 ? (
                  <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {product.stock} items left in store
                  </span>
                ) : (
                  <span className="text-red-500 font-bold text-sm bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    Out of Stock
                  </span>
                )}
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">
                  {errorMsg}
                </div>
              )}

              {/* Add to Cart panel / controls */}
              {product.stock > 0 && product.isAvailable && (!user || user.role === 'student') ? (
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden self-start sm:self-auto shadow-sm">
                    <button
                      onClick={() => handleQtyChange('dec')}
                      disabled={quantity <= 1}
                      className="px-4 py-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-bold"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-slate-800 font-bold text-sm select-none">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQtyChange('inc')}
                      disabled={quantity >= product.stock}
                      className="px-4 py-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Add & Wishlist buttons */}
                  <div className="flex-1 flex gap-4">
                    <button
                      onClick={handleAddToCartSubmit}
                      disabled={addingToCart}
                      className="flex-1 btn-primary py-3 flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart size={18} />
                      <span>{addingToCart ? 'Adding...' : 'Add to Room Order'}</span>
                    </button>

                    <button
                      onClick={handleToggleWishlist}
                      className={`px-4 py-3 rounded-xl border flex items-center justify-center transition-all ${
                        isFavorited
                          ? 'border-red-200 bg-red-50 text-red-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-400'
                      }`}
                    >
                      <Heart size={20} className={isFavorited ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              ) : (
                (!product.isAvailable || product.stock === 0) && (
                  <div className="bg-slate-100 p-4 rounded-xl text-center text-slate-500 font-medium text-sm">
                    This item is currently sold out. Please check back later.
                  </div>
                )
              )}
            </div>

          </div>

        </div>
      </section>

      {/* Reviews section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Review list */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Student Feedback</h2>
          {product.reviews.length === 0 ? (
            <div className="p-8 bg-white border border-slate-100 rounded-2xl text-center text-slate-400 font-medium text-sm">
              No reviews yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="space-y-4">
              {product.reviews.map((rev) => (
                <div key={rev._id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{rev.name}</h4>
                      <p className="text-[10px] text-slate-400">
                        {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    {/* Stars */}
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={`${i < rev.rating ? 'fill-current' : 'text-slate-100'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit review form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-4">
          <h3 className="font-extrabold text-slate-800 text-base">Write a Review</h3>
          
          {user && user.role === 'student' ? (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {reviewError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {reviewError}
                </div>
              )}
              {reviewSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  {reviewSuccess}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Rating</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-amber-400 focus:outline-none"
                    >
                      <Star size={24} className={star <= rating ? 'fill-current' : 'text-slate-200'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="review-comment" className="text-xs font-semibold text-slate-600 block mb-1">
                  Your Review
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  className="input-field text-sm"
                  placeholder="Share your experience using this product..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <button type="submit" className="w-full btn-primary py-3.5 text-sm min-h-[48px]">
                Submit Review
              </button>
            </form>
          ) : user ? (
            <p className="text-xs text-slate-400 italic">
              Only students can submit product reviews.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Please{' '}
              <Link to="/login" className="text-primary-600 font-bold hover:underline">
                Sign In
              </Link>{' '}
              to leave feedback.
            </p>
          )}
        </div>

      </section>
    </div>
  );
};

export default ProductDetails;
