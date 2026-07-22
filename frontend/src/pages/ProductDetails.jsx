import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { productAPI } from '../api';
import { Star, ShoppingCart, Heart, ArrowLeft, Clock, ShieldCheck, RefreshCw, Sparkles, ChevronRight, MessageCircle } from 'lucide-react';
import { getOptimizedImage, getResponsiveSrcSet, getOptimizedImageUrl, getBlurPlaceholderUrl } from '../utils/image';

const ProductDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
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

  // Review states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

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
      backgroundImage: `url(${getOptimizedImageUrl(gallery[selectedImageIndex], 1200)})`
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };

  const fetchProductDetails = async () => {
    try {
      const { data } = await productAPI.getById(id);
      setProduct(data);

      // Track recently viewed products in localStorage
      try {
        const stored = localStorage.getItem('hostelkart_recent_views');
        let views = stored ? JSON.parse(stored) : [];
        views = views.filter((p) => p._id !== data._id);
        views.unshift(data);
        localStorage.setItem('hostelkart_recent_views', JSON.stringify(views.slice(0, 10)));
      } catch (e) {
        console.warn('Failed to save to recently viewed:', e);
      }
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 bg-slate-50/50">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary-600 animate-spin"></div>
        </div>
        <p className="text-xs font-bold text-slate-450 animate-pulse uppercase tracking-wider">Syncing details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4 select-none">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Product Not Found</h2>
        <p className="text-slate-500 text-xs font-bold uppercase">The product you are looking for does not exist or has been removed.</p>
        <Link to="/products" className="btn-primary py-3 px-6 inline-flex items-center justify-center min-h-[48px]">Back to Shop</Link>
      </div>
    );
  }

  const isFavorited = isInWishlist(product._id);
  const discountedPrice = Math.round(
    product.price - (product.price * (product.discount || 0)) / 100
  );
  const saveAmount = product.discount > 0 ? Math.round((product.price * product.discount) / 100) : 0;

  // Find if in cart to enable inline mobile checkout indicators
  const cartItem = cart?.items?.find((item) => item.product && item.product._id === product._id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10 bg-slate-50/10">
      <SEO 
        title={product.name}
        description={product.description}
        ogImage={product.image}
        ogType="product"
        schema={productSchema}
      />

      {/* Back button */}
      <div>
        <Link to="/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary-650 transition-colors uppercase tracking-wider">
          <ArrowLeft size={14} />
          <span>Back to catalog</span>
        </Link>
      </div>

      {/* Product Display Details grid */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden p-6 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          
          {/* Swiper Gallery */}
          <div className="space-y-4">
            <div 
              className="bg-slate-50/60 rounded-3xl p-6 flex items-center justify-center min-h-[300px] md:min-h-[380px] relative border border-slate-100 shadow-inner overflow-hidden group cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div 
                className="absolute inset-0 bg-no-repeat bg-cover pointer-events-none scale-150 transition-transform duration-100 ease-out z-20"
                style={zoomStyle}
              />
              <img
                src={getBlurPlaceholderUrl(gallery[selectedImageIndex])}
                alt=""
                className={`absolute inset-0 w-full h-full object-contain p-6 filter blur-md transition-opacity duration-500 pointer-events-none ${
                  imageLoaded ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <img
                src={getOptimizedImageUrl(gallery[selectedImageIndex], 800)}
                srcSet={getResponsiveSrcSet({ ...product, image: gallery[selectedImageIndex] })}
                sizes="(max-width: 768px) 100vw, 50vw"
                alt={product.name}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full max-h-[320px] object-contain rounded-lg group-hover:scale-102 transition-all duration-500 ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              />
              {product.discount > 0 && (
                <span className="absolute top-4 left-4 bg-rose-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-md">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            {/* Thumbnail selector */}
            {gallery.length > 1 && (
              <div className="flex gap-2 justify-center">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setImageLoaded(false);
                    }}
                    className={`w-14 h-14 rounded-xl border p-1 bg-white overflow-hidden shadow-sm transition-all ${
                      selectedImageIndex === idx ? 'border-primary-600 ring-2 ring-primary-500/10' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={getOptimizedImageUrl(img, 150)}
                      alt={`Product Thumbnail ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details actions */}
          <div className="flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg border border-emerald-100">
                {product.category}
              </span>
              
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating stars & review count summary */}
              <div className="flex items-center space-x-2">
                <div className="flex text-amber-450">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={`${i < Math.round(product.rating) ? 'fill-current text-amber-400' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-slate-700">
                  {product.rating.toFixed(1)} / 5.0
                </span>
                <span className="text-slate-200">|</span>
                <span className="text-xs text-slate-450 font-bold">
                  {product.numReviews} student reviews
                </span>
              </div>

              {/* Pricing section */}
              <div className="flex items-baseline gap-2 border-y border-slate-100 py-4 select-none">
                <span className="text-2xl font-black text-slate-950">₹{discountedPrice}</span>
                {product.discount > 0 && (
                  <>
                    <span className="text-sm text-slate-400 line-through font-semibold">₹{product.price}</span>
                    <span className="bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                      Save ₹{saveAmount}
                    </span>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Product Summary</h4>
                <p className="text-slate-655 text-xs font-semibold leading-relaxed">{product.description}</p>
              </div>
            </div>

            {/* Delivery SLAs & actions */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-550 select-none">
                <div className="flex items-center space-x-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                  <Clock size={12} className="text-primary-600" />
                  <span>Fulfillment: {product.deliveryTime || '10 Mins Slot'}</span>
                </div>
                <div className="flex items-center space-x-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                  <ShieldCheck size={12} className="text-primary-600" />
                  <span>Room Door Delivery</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-500">Warehouse Inventory:</span>
                {product.stock > 0 ? (
                  <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 text-[9px] uppercase tracking-wider">
                    {product.stock} items left
                  </span>
                ) : (
                  <span className="text-rose-650 font-black bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 text-[9px] uppercase tracking-wider animate-pulse">
                    Sold Out
                  </span>
                )}
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-750 text-xs p-3 rounded-2xl border border-red-100 font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Action buttons */}
              {product.stock > 0 && product.isAvailable && (!user || user.role === 'student') ? (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden self-start sm:self-auto bg-white h-10 select-none">
                    <button
                      onClick={() => handleQtyChange('dec')}
                      disabled={quantity <= 1}
                      className="px-3.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-black h-full border-r border-slate-200 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-slate-800 font-black text-xs">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQtyChange('inc')}
                      disabled={quantity >= product.stock}
                      className="px-3.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-black h-full border-l border-slate-200 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex-1 flex gap-3">
                    <button
                      onClick={handleAddToCartSubmit}
                      disabled={addingToCart}
                      className="flex-1 bg-primary-600 hover:bg-primary-750 text-white font-black px-6 h-10 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <ShoppingCart size={14} />
                      <span>{addingToCart ? 'Adding...' : 'Add to Order'}</span>
                    </button>

                    <button
                      onClick={handleToggleWishlist}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                        isFavorited
                          ? 'border-red-200 bg-red-50 text-red-500 shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-400'
                      }`}
                    >
                      <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              ) : (
                (!product.isAvailable || product.stock === 0) && (
                  <div className="bg-slate-50 p-4 rounded-2xl text-center text-slate-450 font-bold text-xs uppercase border border-slate-200/60 select-none">
                    This item is currently sold out
                  </div>
                )
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Review list */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
            <MessageCircle size={15} className="text-primary-600" />
            <span>Student Feedback ({product.reviews.length})</span>
          </h2>
          {product.reviews.length === 0 ? (
            <div className="p-8 bg-white border border-slate-100 rounded-3xl text-center text-slate-400 font-bold text-xs">
              No reviews yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="space-y-4">
              {product.reviews.map((rev) => (
                <div key={rev._id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-3">
                  <div className="flex justify-between items-center select-none">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs">{rev.name}</h4>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase">
                        {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex text-amber-450">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          className={`${i < rev.rating ? 'fill-current text-amber-400' : 'text-slate-100'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed font-semibold">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Write feedback */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium h-fit space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm">Write feedback</h3>
          
          {user && user.role === 'student' ? (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {reviewError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 font-bold">
                  {reviewError}
                </div>
              )}
              {reviewSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 font-bold">
                  {reviewSuccess}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Rating</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-amber-400 focus:outline-none hover:scale-105 active:scale-95 transition-transform"
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      <Star size={20} className={star <= rating ? 'fill-current' : 'text-slate-200'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="review-comment" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Your Review
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  className="input-field text-xs py-2"
                  placeholder="Share your experience using this product..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <button type="submit" className="w-full btn-primary py-2.5 text-xs font-black rounded-xl">
                Submit Review
              </button>
            </form>
          ) : user ? (
            <p className="text-xs text-slate-400 font-bold italic">
              Only students can submit reviews.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Please{' '}
              <Link to="/login" className="text-primary-650 font-black hover:underline">
                Sign In
              </Link>{' '}
              to leave feedback.
            </p>
          )}
        </div>
      </section>

      {/* Mobile Sticky Add Bar */}
      {product.stock > 0 && product.isAvailable && (!user || user.role === 'student') && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md p-3.5 border-t border-slate-100 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.06)] animate-slide-up select-none">
          <div className="leading-tight">
            <span className="text-[9px] text-slate-400 font-black block uppercase">{product.category}</span>
            <span className="text-xs font-black text-slate-800 line-clamp-1 max-w-[160px]">{product.name}</span>
            <span className="text-sm font-black text-primary-600 block">₹{discountedPrice}</span>
          </div>

          <div className="flex items-center gap-2">
            {quantityInCart > 0 ? (
              <div className="flex items-center bg-primary-600 text-white rounded-xl font-black text-xs h-9 overflow-hidden w-24 justify-between shadow-sm">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (quantityInCart === 1) {
                      removeFromCart(product._id);
                    } else {
                      updateQuantity(product._id, quantityInCart - 1);
                    }
                  }}
                  className="px-3 h-full hover:bg-primary-750 active:scale-95 transition-all text-xs font-black flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-extrabold text-xs">{quantityInCart}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (quantityInCart < product.stock) {
                      updateQuantity(product._id, quantityInCart + 1);
                    } else {
                      setErrorMsg('Limit reached');
                    }
                  }}
                  className="px-3 h-full hover:bg-primary-750 active:scale-95 transition-all text-xs font-black flex items-center justify-center"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCartSubmit}
                disabled={addingToCart}
                className="bg-primary-600 hover:bg-primary-750 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all uppercase tracking-wider"
              >
                {addingToCart ? 'ADDING...' : 'ADD'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
          <button 
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-slate-300 p-2 bg-white/10 rounded-full transition-all text-xl font-bold"
          >
            ✕
          </button>
          
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {gallery.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((selectedImageIndex - 1 + gallery.length) % gallery.length);
                  setImageLoaded(false);
                }}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10 text-lg font-bold"
              >
                ◀
              </button>
            )}

            <img
              src={getOptimizedImageUrl(gallery[selectedImageIndex], 1200)}
              alt={product.name}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />

            {gallery.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((selectedImageIndex + 1) % gallery.length);
                  setImageLoaded(false);
                }}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10 text-lg font-bold"
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
