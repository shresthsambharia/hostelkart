import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getOptimizedImage, getResponsiveSrcSet, getOptimizedImageUrl } from '../utils/image';

const ProductCard = ({ product, priority = false }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isFavorited = isInWishlist(product._id);

  const discountedPrice = Math.round(
    product.price - (product.price * (product.discount || 0)) / 100
  );

  // Dynamic Badges logic
  let badgeText = '';
  let badgeStyle = '';
  const charCodeSum = product._id ? product._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  
  if (product.rating >= 4.5 && charCodeSum % 3 === 0) {
    badgeText = 'Best Seller';
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200/50';
  } else if (charCodeSum % 3 === 1) {
    badgeText = 'Fast Delivery';
    badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200/50';
  } else {
    badgeText = 'Popular in Hostel';
    badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200/50';
  }

  const handleAddToCart = async (e) => {
    e.preventDefault();
    setAdding(true);
    setErrorMsg('');
    const res = await addToCart(product._id, 1);
    if (!res.success) {
      setErrorMsg(res.message);
      // Fade out error after 3 seconds
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setAdding(false);
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    await toggleWishlist(product._id);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 hover:border-emerald-250/30 overflow-hidden flex flex-col justify-between relative group shadow-premium hover:-translate-y-1.5 transition-all duration-300">
      {/* Discount badge */}
      {product.discount > 0 && (
        <span className="absolute top-3 left-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md z-10 shadow-sm uppercase tracking-wider">
          {product.discount}% OFF
        </span>
      )}

      {/* Wishlist toggle */}
      <button
        onClick={handleToggleWishlist}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/95 shadow-sm border border-slate-100 hover:scale-105 active:scale-95 z-10 transition-transform text-slate-450 hover:text-red-500"
      >
        <Heart
          size={15}
          className={`${isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
        />
      </button>

      {/* Product Image Link */}
      <Link to={`/products/${product._id}`} className="block overflow-hidden bg-slate-50/50 relative pt-[100%] border-b border-slate-50/60">
        {product.image ? (
          <img
            src={getOptimizedImage(product, 'medium')}
            srcSet={getResponsiveSrcSet(product)}
            sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 220px"
            alt={product.name}
            loading={priority ? undefined : "lazy"}
            fetchPriority={priority ? "high" : "low"}
            decoding="async"
            width={300}
            height={300}
            className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getOptimizedImageUrl(null, 300);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold">
            No Image
          </div>
        )}

        {/* Unavailable overlay */}
        {(!product.isAvailable || product.stock === 0) && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-red-650 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-md shadow-md tracking-wider">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Info details */}
      <div className="p-3.5 flex flex-col flex-grow justify-between space-y-3">
        <div>
          {/* Category & Badge */}
          <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
            <span className="text-[9px] font-black text-primary-650 uppercase tracking-wider">
              {product.category}
            </span>
            {badgeText && (
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${badgeStyle}`}>
                {badgeText}
              </span>
            )}
          </div>

          {/* Title name */}
          <Link to={`/products/${product._id}`} className="hover:text-primary-650 transition-colors block">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 min-h-[2.2rem] leading-tight">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center space-x-1 mt-1">
            <div className="flex text-amber-455">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  className={`${i < Math.round(product.rating) ? 'fill-current text-amber-400' : 'text-slate-200'}`}
                />
              ))}
            </div>
            <span className="text-[9px] text-slate-400 font-bold">
              ({product.numReviews})
            </span>
          </div>
        </div>

        <div>
          {/* Pricing Row */}
          <div className="flex items-baseline space-x-1.5">
            <span className="text-sm sm:text-base font-black text-slate-900">
              ₹{discountedPrice}
            </span>
            {product.discount > 0 && (
              <span className="text-xs text-slate-400 line-through font-semibold">
                ₹{product.price}
              </span>
            )}
          </div>

          {/* Delivery & Stock indicators */}
          <div className="flex justify-between items-center mt-2.5 mb-2.5 gap-1.5">
            <span className="inline-flex items-center text-[9px] font-black text-amber-800 bg-amber-50/85 px-1.5 py-0.5 rounded border border-amber-150 shrink-0 uppercase tracking-wide">
              ⏱️ {product.deliveryTime || '30 Min'}
            </span>
            {product.stock > 0 && product.stock <= 5 ? (
              <span className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded text-[9px] border border-rose-100 shrink-0">Only {product.stock} left</span>
            ) : product.stock > 5 ? (
              <span className="text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] border border-emerald-100 shrink-0">In Stock</span>
            ) : (
              <span className="text-red-500 font-extrabold bg-red-50 px-1.5 py-0.5 rounded text-[9px] border border-red-100 shrink-0">Sold Out</span>
            )}
          </div>

          {/* Error notice */}
          {errorMsg && (
            <p className="text-[10px] text-red-500 font-medium bg-red-50 p-1.5 rounded mb-2 text-center truncate">
              {errorMsg}
            </p>
          )}

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            disabled={!product.isAvailable || product.stock === 0 || adding}
            className={`w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg font-black text-xs transition-all shadow-sm active:scale-95 border ${
              !product.isAvailable || product.stock === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 shadow-none'
                : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
            }`}
          >
            <ShoppingCart size={13} className="shrink-0" />
            <span>{adding ? 'Adding...' : 'ADD'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProductCardSkeleton = () => (
  <div className="card relative flex flex-col justify-between overflow-hidden p-4 space-y-4 animate-pulse h-[390px] bg-white border border-slate-100 rounded-2xl">
    <div className="bg-slate-100 rounded-xl aspect-square w-full"></div>
    <div className="space-y-3 flex-grow mt-2">
      <div className="h-3 bg-slate-100 rounded w-1/4"></div>
      <div className="h-4 bg-slate-100 rounded w-3/4"></div>
      <div className="h-4 bg-slate-100 rounded w-5/6"></div>
      <div className="h-3 bg-slate-100 rounded w-1/3 mt-2"></div>
    </div>
    <div className="space-y-3 mt-4">
      <div className="h-5 bg-slate-100 rounded w-1/3"></div>
      <div className="h-12 bg-slate-100 rounded-lg w-full"></div>
    </div>
  </div>
);

export default React.memo(ProductCard);
