import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { wishlistAPI } from '../api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState({ products: [] });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchWishlist = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [user]);

  const toggleWishlist = useCallback(async (productId) => {
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
  }, [user]);

  const isInWishlist = useCallback((productId) => {
    if (!wishlist || !wishlist.products) return false;
    return wishlist.products.some((p) => {
      const pId = typeof p === 'object' ? p._id : p;
      return pId.toString() === productId.toString();
    });
  }, [wishlist]);

  const contextValue = useMemo(() => ({
    wishlist,
    loading,
    fetchWishlist,
    toggleWishlist,
    isInWishlist,
  }), [wishlist, loading, fetchWishlist, toggleWishlist, isInWishlist]);

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
