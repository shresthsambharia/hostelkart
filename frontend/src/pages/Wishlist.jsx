import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';

const Wishlist = () => {
  const { wishlist, loading } = useWishlist();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const hasItems = wishlist && wishlist.products && wishlist.products.length > 0;

  if (!hasItems) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6 animate-slide-up">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 text-3xl">
          ❤️
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800">Your wishlist is empty</h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Tap the heart icon on any essential product card to save it here for quick ordering later.
        </p>
        <Link to="/products" className="btn-primary py-3 px-6 inline-flex items-center space-x-2">
          <ShoppingBag size={18} />
          <span>Browse Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-2">
          <Heart size={24} className="text-red-500 fill-current" />
          <span>My Favorite Essentials</span>
        </h1>
        <p className="text-sm text-slate-500">
          You have <span className="font-bold text-slate-700">{wishlist.products.length}</span> favorited products saved
        </p>
      </div>

      {/* Wishlist grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
        {wishlist.products.map((product) => (
          // In case populate didn't work for deleted items, check for product existence
          product ? <ProductCard key={product._id} product={product} /> : null
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
