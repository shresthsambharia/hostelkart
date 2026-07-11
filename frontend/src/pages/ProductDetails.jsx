import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { productAPI } from '../api';
import { Star, ShoppingCart, Heart, ArrowLeft, Clock, ShieldCheck, RefreshCcw } from 'lucide-react';
import { getOptimizedImage, getResponsiveSrcSet, getBlurPlaceholderUrl } from '../utils/image';

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
  const [imageLoaded, setImageLoaded] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' });

  const gallery = product ? [
    product.image,
    product.imageOriginal || product.image,
    product.imageMedium || product.image
  ].filter(Boolean) : [];

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomStyle({
      display: 'block',
      transformOrigin: `${x}% ${y}%`,
      backgroundImage: `url(${getOptimizedImageUrl(gallery[selectedImageIndex], 1600)})`
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };
  
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

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    await toggleWishlist(product._id);
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

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.name,
    'image': product.image,
    'description': product.description,
    'category': product.category,
    'offers': {
      '@type': 'Offer',
      'priceCurrency': 'INR',
      'price': discountedPrice,
      'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'url': window.location.href,
    },
    'aggregateRating': product.numReviews > 0 ? {
      '@type': 'AggregateRating',
      'ratingValue': product.rating,
      'reviewCount': product.numReviews,
    } : undefined,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <SEO 
        title={product.name}
        description={product.description}
        ogImage={product.image}
        ogType="product"
        schema={productSchema}
      />
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
          
          {/* Product Image Panel & Gallery */}
          <div className="space-y-4">
            <div 
              className="bg-slate-55/60 rounded-3xl p-6 flex items-center justify-center min-h-[300px] md:min-h-[400px] relative border border-slate-100 shadow-sm overflow-hidden group cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Zoom lens container */}
              <div 
                className="absolute inset-0 bg-no-repeat bg-cover pointer-events-none scale-150 transition-transform duration-100 ease-out z-25"
                style={zoomStyle}
              />

              {/* Blurred placeholder for blur-up loading effect */}
              <img
                src={getBlurPlaceholderUrl(gallery[selectedImageIndex])}
                alt=""
                className={`absolute inset-0 w-full h-full object-contain p-6 filter blur-md transition-opacity duration-500 pointer-events-none ${
                  imageLoaded ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <img
                src={getOptimizedImageUrl(gallery[selectedImageIndex], 800)}
                srcSet={getSrcSet(gallery[selectedImageIndex])}
                sizes="(max-width: 768px) 100vw, 50vw"
                alt={product.name}
                fetchPriority="high"
                decoding="async"
                width={600}
                height={600}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full max-h-[350px] object-contain rounded-lg group-hover:scale-102 transition-all duration-500 ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getOptimizedImage(null, 'original');
                  setImageLoaded(true);
                }}
              />
              {product.discount > 0 && (
                <span className="absolute top-4 left-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase shadow-md">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            {/* Gallery Thumbnails */}
            {gallery.length > 1 && (
              <div className="flex gap-3 justify-center">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setImageLoaded(false);
                    }}
                    className={`w-16 h-16 rounded-xl border p-1 bg-white overflow-hidden shadow-sm transition-all ${
                      selectedImageIndex === idx ? 'border-primary-600 ring-2 ring-primary-500/20' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={getOptimizedImageUrl(img, 150)}
                      alt={`Product Thumbnail ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Specifications & Order controls */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 text-[10px] font-black uppercase rounded-lg border border-primary-100">
                {product.category}
              </span>
              
              <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Rating stars & review count summary */}
              <div className="flex items-center space-x-2">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={`${i < Math.round(product.rating) ? 'fill-current text-amber-450' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-slate-700">
                  {product.rating.toFixed(1)} / 5.0
                </span>
                <span className="text-slate-200">|</span>
                <span className="text-xs text-slate-500 font-bold">
                  {product.numReviews} student reviews
                </span>
              </div>

              {/* Pricing section */}
              <div className="flex items-center space-x-3 border-y border-slate-100 py-4">
                <span className="text-3xl font-black text-slate-900">₹{discountedPrice}</span>
                {product.discount > 0 && (
                  <>
                    <span className="text-base text-slate-450 line-through font-semibold">₹{product.price}</span>
                    <span className="bg-rose-55 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wide">
                      {product.discount}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
            </div>

            {/* Availability details & actions */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500">
                <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Clock size={14} className="text-primary-650" />
                  <span>Delivery: {product.deliveryTime || 'Scheduled Delivery'}</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <ShieldCheck size={14} className="text-primary-650" />
                  <span>Campus Quality Guaranteed</span>
                </div>
              </div>

              {/* Stock check */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="font-semibold text-slate-600">Availability:</span>
                {product.stock > 0 ? (
                  <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase text-[9px] tracking-wider">
                    {product.stock} items in store
                  </span>
                ) : (
                  <span className="text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase text-[9px] tracking-wider">
                    Out of Stock
                  </span>
                )}
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-750 text-xs p-3 rounded-lg border border-red-100 font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Add to Cart panel / controls */}
              {product.stock > 0 && product.isAvailable && (!user || user.role === 'student') ? (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden self-start sm:self-auto shadow-sm bg-white h-[42px]">
                    <button
                      onClick={() => handleQtyChange('dec')}
                      disabled={quantity <= 1}
                      className="px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-black h-full border-r border-slate-200 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-slate-800 font-black text-xs select-none">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQtyChange('inc')}
                      disabled={quantity >= product.stock}
                      className="px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-black h-full border-l border-slate-200 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Add & Wishlist buttons */}
                  <div className="flex-1 flex gap-3">
                    <button
                      onClick={handleAddToCartSubmit}
                      disabled={addingToCart}
                      className="flex-1 bg-primary-600 hover:bg-primary-750 text-white font-black px-6 h-[42px] rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all text-xs flex items-center justify-center space-x-2 tracking-wider uppercase"
                    >
                      <ShoppingCart size={15} />
                      <span>{addingToCart ? 'Adding...' : 'Add to Room Order'}</span>
                    </button>

                    <button
                      onClick={handleToggleWishlist}
                      className={`w-[42px] h-[42px] rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                        isFavorited
                          ? 'border-red-200 bg-red-50 text-red-500 shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-650'
                      }`}
                    >
                      <Heart size={18} className={isFavorited ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              ) : (
                (!product.isAvailable || product.stock === 0) && (
                  <div className="bg-slate-100 p-4 rounded-xl text-center text-slate-500 font-bold text-xs uppercase border border-slate-200/60">
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
                      aria-label={`Rate ${star} out of 5 stars`}
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

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <button 
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-slate-300 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-xl"
          >
            ✕
          </button>
          
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            {gallery.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((selectedImageIndex - 1 + gallery.length) % gallery.length);
                }}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10 text-lg"
              >
                ◀
              </button>
            )}

            <img
              src={getOptimizedImageUrl(gallery[selectedImageIndex], 1600)}
              alt={product.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />

            {gallery.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((selectedImageIndex + 1) % gallery.length);
                }}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10 text-lg"
              >
                ▶
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
