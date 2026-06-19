import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isFavorited = isInWishlist(product._id);

  const discountedPrice = Math.round(
    product.price - (product.price * (product.discount || 0)) / 100
  );

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

  // Safe image path checker
  const getProductImage = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';
    // If it is absolute external URL, return it
    if (img.startsWith('http')) return img;
    // Serve from backend static uploads folder
    return img;
  };

  return (
    <div className="card relative flex flex-col justify-between overflow-hidden group">
      {/* Discount badge */}
      {product.discount > 0 && (
        <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full z-10 shadow-sm uppercase tracking-wide">
          {product.discount}% OFF
        </span>
      )}

      {/* Wishlist toggle */}
      <button
        onClick={handleToggleWishlist}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 shadow-sm border border-slate-100 hover:scale-105 active:scale-95 z-10 transition-transform text-slate-400 hover:text-red-500"
      >
        <Heart
          size={16}
          className={`${isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-400'}`}
        />
      </button>

      {/* Product Image Link */}
      <Link to={`/products/${product._id}`} className="block overflow-hidden bg-slate-50 relative pt-[100%]">
        {product.image ? (
          <img
            src={getProductImage(product.image)}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400';
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
            <span className="bg-red-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-lg shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Info details */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          {/* Category */}
          <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider block mb-1">
            {product.category}
          </span>

          {/* Title name */}
          <Link to={`/products/${product._id}`} className="hover:text-primary-600 transition-colors block">
            <h3 className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center space-x-1 mt-1 mb-2">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={`${i < Math.round(product.rating) ? 'fill-current' : 'text-slate-200'}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              ({product.numReviews})
            </span>
          </div>
        </div>

        <div>
          {/* Pricing Row */}
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-base font-extrabold text-slate-900">
              ₹{discountedPrice}
            </span>
            {product.discount > 0 && (
              <span className="text-xs text-slate-400 line-through">
                ₹{product.price}
              </span>
            )}
          </div>

          {/* Delivery & Stock indicators */}
          <div className="flex justify-between items-center text-[10px] mt-2 mb-3 text-slate-400">
            <span>🚀 {product.deliveryTime}</span>
            {product.stock > 0 && product.stock <= 5 ? (
              <span className="text-amber-600 font-bold">Only {product.stock} left</span>
            ) : product.stock > 5 ? (
              <span className="text-emerald-600 font-semibold">In Stock</span>
            ) : (
              <span className="text-red-500 font-semibold">Out of Stock</span>
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
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 min-h-[48px] rounded-lg font-bold text-sm transition-all ${
              !product.isAvailable || product.stock === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white border border-primary-100 shadow-sm'
            }`}
          >
            <ShoppingCart size={16} />
            <span>{adding ? 'Adding...' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
