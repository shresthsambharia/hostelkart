import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft, Percent, Gift, ChevronRight, Sparkles } from 'lucide-react';
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
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6 animate-slide-up select-none">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border border-emerald-100/50">
          🛒
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Your Cart is Empty</h2>
          <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed font-bold uppercase">
            Add items to get direct-to-room hostel delivery.
          </p>
        </div>
        <Link to="/products" className="bg-primary-600 hover:bg-primary-750 text-white font-black px-6 py-3 rounded-xl inline-flex items-center gap-1.5 text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all">
          <ShoppingBag size={14} />
          <span>Shop Essentials</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-6 bg-primary-600 rounded-full block"></span>
          Shopping Cart ({itemsCount} Items)
        </h1>
        <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">Review items in your active hostel room order</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Item Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3">
            {cart.items.map((item) => {
              if (!item.product) return null;
              const product = item.product;
              const discountedPrice = Math.round(
                product.price - (product.price * (product.discount || 0)) / 100
              );
              const saveAmount = product.discount > 0 ? Math.round((product.price * product.discount) / 100) : 0;

              return (
                <div
                  key={item._id}
                  className="bg-white p-4 rounded-3xl border border-slate-100 shadow-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative group hover:border-emerald-100/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      <img
                        src={getThumbnail(product)}
                        alt={product.name}
                        className="w-12 h-12 object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getThumbnail(null);
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">
                        {product.category}
                      </span>
                      <Link to={`/products/${product._id}`} className="hover:text-primary-600 transition-colors block">
                        <h3 className="text-xs font-bold text-slate-800 truncate pr-4">{product.name}</h3>
                      </Link>
                      
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-black text-slate-900">₹{discountedPrice}</span>
                        {product.discount > 0 && (
                          <>
                            <span className="text-[10px] text-slate-400 line-through font-semibold">₹{product.price}</span>
                            <span className="text-[9px] text-rose-600 font-black">Save ₹{saveAmount}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 w-full sm:w-auto select-none">
                    {/* Inline quantity controller */}
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm h-8">
                      <button
                        onClick={() => handleQuantityChange(product._id, item.quantity, 'dec')}
                        disabled={item.quantity <= 1 || loading}
                        className="px-2.5 h-full hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-black transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-slate-700 text-xs font-black">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(product._id, item.quantity, 'inc')}
                        disabled={item.quantity >= product.stock || loading}
                        className="px-2.5 h-full hover:bg-slate-100 disabled:opacity-50 text-slate-650 font-black transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(product._id)}
                      disabled={loading}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Link to="/products" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-primary-650 uppercase tracking-wider">
              <ArrowLeft size={12} />
              <span>Add More items</span>
            </Link>
          </div>

          {/* Quick Cross-sell suggestions section */}
          <div className="bg-gradient-to-r from-emerald-50 to-primary-50 border border-emerald-100 p-5 rounded-3xl space-y-3 shadow-premium-sm select-none">
            <div className="flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin-slow" />
              <h3 className="text-xs font-black uppercase tracking-wider">Add snacks or fresh fruits?</h3>
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold leading-relaxed">Complete your cart value to unlock promo codes & free direct-to-room shipping slots!</p>
            <div className="flex gap-2 flex-wrap">
              {['Fruits', 'Dairy Products', 'Personal Care'].map((categoryName) => (
                <Link
                  key={categoryName}
                  to={`/products?category=${encodeURIComponent(categoryName)}`}
                  className="px-3 py-1.5 bg-white border border-emerald-100 hover:border-emerald-300 rounded-xl text-[10px] font-black text-emerald-700 transition-all shadow-sm flex items-center gap-0.5"
                >
                  <span>Browse {categoryName}</span>
                  <ChevronRight size={10} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Summary card */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-5">
            <h2 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">
              Bill Specifications
            </h2>

            <div className="bg-primary-50/50 border border-primary-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-primary-800 select-none leading-relaxed">
              <span className="text-base leading-none">⚡</span>
              <div>
                <p className="font-black">Superfast room corridor dispatch</p>
                <p className="text-[10px] text-primary-650 font-bold mt-0.5">Assigned to nearby student rider</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between text-slate-500 font-bold">
                <span>Items Subtotal ({itemsCount})</span>
                <span>₹{subtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Product Discounts</span>
                  <span>-₹{Math.round(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 font-bold">
                <span>Delivery Charge</span>
                <span className="text-emerald-600 font-black">FREE</span>
              </div>
              <div className="border-t border-slate-100 pt-3.5 flex justify-between text-slate-900 font-black text-sm">
                <span>Grand Total</span>
                <span>₹{total}</span>
              </div>
            </div>

            {discountAmount > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center text-[10px] text-emerald-700 font-black uppercase tracking-wider select-none">
                🎉 You are saving ₹{Math.round(discountAmount)} on this order!
              </div>
            )}

            <button
              onClick={handleCheckoutClick}
              className="w-full bg-primary-600 hover:bg-primary-750 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
