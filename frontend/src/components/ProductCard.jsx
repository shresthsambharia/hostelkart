import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getOptimizedImage, getResponsiveSrcSet, getOptimizedImageUrl, getBlurPlaceholderUrl } from '../utils/image';
import { motion } from 'framer-motion';

const ProductCard = ({ product, priority = false }) => {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!product || typeof product !== 'object' || !product._id) {
    return null;
  }

  const isFavorited = isInWishlist(product._id);
  const discountedPrice = Math.round(
    product.price - (product.price * (product.discount || 0)) / 100
  );
  const saveAmount = product.discount > 0 ? Math.round((product.price * product.discount) / 100) : 0;

  const cartItem = cart?.items?.find((item) => item.product && item.product._id === product._id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  let badgeText = '';
  let badgeStyle = '';
  const charCodeSum = product._id ? product._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  
  if (product.rating >= 4.5 && charCodeSum % 3 === 0) {
    badgeText = 'Best Seller';
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-100';
  } else if (charCodeSum % 3 === 1) {
    badgeText = 'Fast Delivery';
    badgeStyle = 'bg-blue-50 text-blue-700 border-blue-100';
  } else {
    badgeText = 'Popular';
    badgeStyle = 'bg-purple-50 text-purple-700 border-purple-100';
  }

  const handleAddToCart = async (e) => {
    e.preventDefault();
    setAdding(true);
    setErrorMsg('');
    const res = await addToCart(product._id, 1);
    if (!res.success) {
      setErrorMsg(res.message);
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setAdding(false);
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    await toggleWishlist(product._id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.2 } }}
      className="bg-white rounded-3xl border border-slate-100/90 hover:border-emerald-250/50 overflow-hidden flex flex-col justify-between relative group shadow-premium select-none"
    >
      {/* Top badges & actions */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
        {product.discount > 0 ? (
          <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm uppercase tracking-wider">
            {product.discount}% OFF
          </span>
        ) : (
          <span />
        )}

        <button
          onClick={handleToggleWishlist}
          aria-label={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
          className="p-1.5 rounded-full bg-white/95 shadow-sm border border-slate-100 hover:scale-105 active:scale-95 transition-transform text-slate-400 hover:text-red-500"
        >
          <Heart
            size={13}
            className={`${isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
          />
        </button>
      </div>

      {/* Image Container */}
      <Link to={`/products/${product._id}`} className="block overflow-hidden bg-slate-50/50 relative pt-[100%] border-b border-slate-100">
        {product.image ? (
          <>
            <img
              src={getBlurPlaceholderUrl(product.image)}
              alt=""
              className={`absolute inset-0 w-full h-full object-contain p-4 filter blur-md transition-opacity duration-500 pointer-events-none ${
                imageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <img
              src={getOptimizedImage(product, 'medium')}
              srcSet={getResponsiveSrcSet(product)}
              sizes="(max-width: 640px) 40vw, 220px"
              alt={product.name}
              loading={priority ? undefined : "lazy"}
              onLoad={() => setImageLoaded(true)}
              className={`absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-all duration-500 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-extrabold text-xs">
            No Image
          </div>
        )}

        {(!product.isAvailable || product.stock === 0) && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-red-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-lg shadow-md tracking-wider">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Specifications */}
      <div className="p-3.5 flex flex-col flex-grow justify-between gap-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">
              {product.category}
            </span>
            {badgeText && (
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg border uppercase tracking-wider ${badgeStyle}`}>
                {badgeText}
              </span>
            )}
          </div>

          <Link to={`/products/${product._id}`} className="hover:text-primary-600 transition-colors block">
            <h3 className="text-xs font-bold text-slate-800 line-clamp-2 min-h-[2rem] leading-tight">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  className={`${i < Math.round(product.rating) ? 'fill-current' : 'text-slate-200'}`}
                />
              ))}
            </div>
            <span className="text-[9px] text-slate-400 font-bold">({product.numReviews})</span>
          </div>
        </div>

        <div>
          {/* Prices */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-slate-950">₹{discountedPrice}</span>
            {product.discount > 0 && (
              <>
                <span className="text-[10px] text-slate-400 line-through font-semibold">₹{product.price}</span>
                <span className="text-[9px] text-emerald-600 font-black">Save ₹{saveAmount}</span>
              </>
            )}
          </div>

          {/* Delivery & stock status */}
          <div className="flex justify-between items-center mt-2.5 mb-2.5 gap-1">
            <span className="inline-flex items-center text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-100 uppercase tracking-wide">
              ⏱️ {product.deliveryTime || '10 Mins slot'}
            </span>
            {product.stock > 0 && product.stock <= 5 ? (
              <span className="text-rose-600 font-black bg-rose-50 px-1.5 py-0.5 rounded-lg text-[9px] border border-rose-100">Only {product.stock} left</span>
            ) : product.stock > 5 ? (
              <span className="text-emerald-650 font-black bg-emerald-50 px-1.5 py-0.5 rounded-lg text-[9px] border border-emerald-100">In Stock</span>
            ) : (
              <span className="text-red-500 font-black bg-red-50 px-1.5 py-0.5 rounded-lg text-[9px] border border-red-100">Sold Out</span>
            )}
          </div>

          {errorMsg && (
            <p className="text-[9px] text-red-500 font-bold bg-red-50 p-1.5 rounded-xl mb-2 text-center truncate">
              {errorMsg}
            </p>
          )}

          {/* Add actions toggle */}
          {quantityInCart > 0 ? (
            <div className="flex items-center justify-between bg-primary-600 text-white rounded-xl font-black text-xs h-8 overflow-hidden transition-all shadow-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (quantityInCart === 1) {
                    removeFromCart(product._id);
                  } else {
                    updateQuantity(product._id, quantityInCart - 1);
                  }
                }}
                className="px-3.5 h-full hover:bg-primary-700 active:scale-95 transition-all text-sm font-black flex items-center justify-center"
              >
                -
              </button>
              <span className="font-extrabold text-xs select-none">{quantityInCart}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (quantityInCart < product.stock) {
                    updateQuantity(product._id, quantityInCart + 1);
                  } else {
                    setErrorMsg('Limit reached');
                    setTimeout(() => setErrorMsg(''), 3000);
                  }
                }}
                className="px-3.5 h-full hover:bg-primary-700 active:scale-95 transition-all text-sm font-black flex items-center justify-center"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!product.isAvailable || product.stock === 0 || adding}
              className={`w-full py-1.5 rounded-xl font-black text-xs tracking-wider border shadow-sm transition-all active:scale-95 ${
                !product.isAvailable || product.stock === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
                  : 'bg-white text-emerald-600 border-emerald-250 hover:bg-primary-600 hover:text-white hover:border-primary-600'
              }`}
            >
              {adding ? 'ADDING...' : 'ADD'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(ProductCard);
