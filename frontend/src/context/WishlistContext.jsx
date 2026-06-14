import React, { createContext, useContext, useState, useEffect } from 'react';
import { wishlistAPI } from '../api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState({ products: [] });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchWishlist = async () => {
    if (user && user.role === 'student') {
      setLoading(true);
      try {
        const { data } = await wishlistAPI.get();
        setWishlist(data);
      } catch (error) {
        console.error('Error fetching wishlist:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setWishlist({ products: [] });
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [user]);

  const toggleWishlist = async (productId) => {
    if (!user) return { success: false, message: 'Please login to add items to wishlist.' };
    if (user.role !== 'student') return { success: false, message: 'Only students can manage wishlists.' };

    setLoading(true);
    try {
      const { data } = await wishlistAPI.toggle(productId);
      setWishlist(data);
      return { success: true };
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update wishlist.',
      };
    } finally {
      setLoading(false);
    }
  };

  const isInWishlist = (productId) => {
    if (!wishlist || !wishlist.products) return false;
    return wishlist.products.some((p) => {
      const pId = typeof p === 'object' ? p._id : p;
      return pId.toString() === productId.toString();
    });
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        fetchWishlist,
        toggleWishlist,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
