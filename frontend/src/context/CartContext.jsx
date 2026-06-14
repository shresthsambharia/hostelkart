import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastTimeoutId, setToastTimeoutId] = useState(null);
  const { user } = useAuth();

  const fetchCart = async () => {
    if (user && user.role === 'student') {
      setLoading(true);
      try {
        const { data } = await cartAPI.get();
        setCart(data);
      } catch (error) {
        console.error('Error fetching cart:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setCart({ items: [] });
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    if (!user) return { success: false, message: 'Please login to add items to cart.' };
    if (user.role !== 'student') return { success: false, message: 'Only students can order items.' };

    setLoading(true);
    try {
      const { data } = await cartAPI.add(productId, quantity);
      setCart(data);
      setShowToast(true);
      if (toastTimeoutId) clearTimeout(toastTimeoutId);
      const tId = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      setToastTimeoutId(tId);
      return { success: true };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add item to cart.',
      };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    setLoading(true);
    try {
      const { data } = await cartAPI.updateQuantity(productId, quantity);
      setCart(data);
      return { success: true };
    } catch (error) {
      console.error('Error updating quantity:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update quantity.',
      };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    setLoading(true);
    try {
      const { data } = await cartAPI.remove(productId);
      setCart(data);
      return { success: true };
    } catch (error) {
      console.error('Error removing item:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove item.',
      };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      await cartAPI.clear();
      setCart({ items: [] });
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Compute stats
  const itemsCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = cart.items.reduce((acc, item) => {
    if (!item.product) return acc;
    return acc + item.product.price * item.quantity;
  }, 0);

  const discountAmount = cart.items.reduce((acc, item) => {
    if (!item.product) return acc;
    const itemPrice = item.product.price;
    const discount = item.product.discount || 0;
    return acc + (itemPrice * (discount / 100)) * item.quantity;
  }, 0);

  const total = Math.round(subtotal - discountAmount);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        itemsCount,
        subtotal,
        discountAmount,
        total,
      }}
    >
      {children}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white font-semibold px-4 py-3 rounded-xl shadow-2xl border border-emerald-500 animate-slide-up flex items-center space-x-2">
          <span className="text-base">✨</span>
          <span>Product added to cart successfully</span>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
