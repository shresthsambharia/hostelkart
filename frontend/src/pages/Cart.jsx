import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { getThumbnail } from '../utils/image';

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
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6 animate-slide-up">
        <div className="w-28 h-28 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-5xl shadow-inner border border-emerald-100/40">
          🛒
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your Cart is Empty</h2>
          <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
            Looks like you haven't added any essentials to your cart yet. Let's browse some fresh fruits, snacks, or stationery!
          </p>
        </div>
        <Link to="/products" className="bg-primary-600 hover:bg-primary-750 text-white font-black px-6 py-3 rounded-lg inline-flex items-center space-x-2 text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all">
          <ShoppingBag size={15} />
          <span>Browse Products</span>
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
                      src={getThumbnail(product)}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getThumbnail(null);
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
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-5">
          <h2 className="font-extrabold text-slate-800 text-base border-b border-slate-100 pb-3">
            Order Summary
          </h2>

          <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-xl p-3 flex items-center space-x-3 text-xs text-emerald-800">
            <span className="text-xl">⚡</span>
            <div>
              <p className="font-black">Delivered to your room in 30 mins!</p>
              <p className="text-emerald-650 font-bold mt-0.5">Rider will contact you on arrival</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-slate-500 font-bold">
              <span>Items Total ({itemsCount})</span>
              <span>₹{subtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Discount</span>
                <span>-₹{Math.round(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 font-bold">
              <span>Delivery Charge</span>
              <span className="text-emerald-650 font-black">FREE</span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between text-slate-850 font-black text-sm">
              <span>Total Amount</span>
              <span>₹{total}</span>
            </div>
          </div>

          {discountAmount > 0 && (
            <div className="bg-rose-50/50 border border-rose-100/50 rounded-xl p-3 text-center text-[10px] text-rose-700 font-black uppercase tracking-wider">
              🎉 You are saving ₹{Math.round(discountAmount)} on this order!
            </div>
          )}

          <button
            onClick={handleCheckoutClick}
            className="w-full bg-primary-600 hover:bg-primary-750 text-white font-black py-3 rounded-lg flex items-center justify-center space-x-2 text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all min-h-[44px]"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
