import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/SkeletonLoader';
import { Heart, ShoppingBag, ChevronRight } from 'lucide-react';

const Wishlist = () => {
  const { wishlist, loading } = useWishlist();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Heart size={20} className="text-rose-500 fill-current" />
            <span>My Favorites</span>
          </h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const hasItems = wishlist && wishlist.products && wishlist.products.length > 0;

  if (!hasItems) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6 animate-slide-up select-none">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border border-rose-100/50">
          ❤️
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Your Wishlist is Empty</h2>
          <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed font-bold uppercase">
            Tap the heart icon on products to save them for quick access!
          </p>
        </div>
        <Link to="/products" className="bg-primary-600 hover:bg-primary-750 text-white font-black px-6 py-3 rounded-xl inline-flex items-center gap-1.5 text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all">
          <ShoppingBag size={14} />
          <span>Browse Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Heart size={20} className="text-rose-500 fill-rose-500" />
          <span>My Favorites</span>
        </h1>
        <p className="text-[10px] text-slate-455 font-bold uppercase mt-1">
          You have <span className="text-slate-800 font-extrabold">{wishlist.products.length}</span> favorited items saved
        </p>
      </div>

      {/* Wishlist grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
        {wishlist.products.map((product) => (
          product ? <ProductCard key={product._id} product={product} /> : null
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
