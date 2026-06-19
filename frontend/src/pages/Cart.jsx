import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';

const Cart = () => {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    itemsCount,
    subtotal,
    discountAmount,
    total,
    loading,
  } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = async (productId, currentQty, type) => {
    if (type === 'inc') {
      await updateQuantity(productId, currentQty + 1);
    } else if (type === 'dec' && currentQty > 1) {
      await updateQuantity(productId, currentQty - 1);
    }
  };

  const handleCheckoutClick = () => {
    navigate('/checkout');
  };

  if (itemsCount === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6 animate-slide-up">
        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto text-4xl">
          🛒
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800">Your cart is empty</h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Looks like you haven't added any essentials to your cart yet. Let's browse some daily essentials.
        </p>
        <Link to="/products" className="btn-primary py-3 px-6 inline-flex items-center space-x-2">
          <ShoppingBag size={18} />
          <span>Start Shopping</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8">
        Your Shopping Cart
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items list */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            if (!item.product) return null;
            const product = item.product;
            const discountedPrice = Math.round(
              product.price - (product.price * (product.discount || 0)) / 100
            );

            return (
              <div
                key={item._id}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Image */}
                  <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                    <img
                      src={product.image || '/uploads/default-product.png'}
                      alt={product.name}
                      loading="lazy"
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/uploads/default-product.png';
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider block">
                      {product.category}
                    </span>
                    <Link to={`/products/${product._id}`} className="hover:text-primary-600 transition-colors">
                      <h3 className="text-sm font-bold text-slate-800 truncate pr-6">{product.name}</h3>
                    </Link>
                    
                    {/* Price */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-800">₹{discountedPrice}</span>
                      {product.discount > 0 && (
                        <span className="text-xs text-slate-400 line-through">₹{product.price}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-row items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 w-full sm:w-auto">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange(product._id, item.quantity, 'dec')}
                      disabled={item.quantity <= 1 || loading}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-500 font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-slate-700 text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(product._id, item.quantity, 'inc')}
                      disabled={item.quantity >= product.stock || loading}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-500 font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(product._id)}
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Back link */}
          <div className="pt-2">
            <Link to="/products" className="inline-flex items-center space-x-1 text-sm font-bold text-slate-500 hover:text-primary-600">
              <ArrowLeft size={16} />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-6">
          <h2 className="font-extrabold text-slate-800 text-lg border-b border-slate-100 pb-3">
            Order Summary
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Items Total ({itemsCount})</span>
              <span>₹{subtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-500 font-medium">
                <span>Discount</span>
                <span>-₹{Math.round(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Delivery Charge</span>
              <span className="text-emerald-600 font-bold">FREE</span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between text-slate-800 font-extrabold text-base">
              <span>Total Amount</span>
              <span>₹{total}</span>
            </div>
          </div>

          <button
            onClick={handleCheckoutClick}
            className="w-full btn-primary py-3 flex items-center justify-center space-x-2 text-sm"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
