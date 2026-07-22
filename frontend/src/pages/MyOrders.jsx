import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Truck, Calendar, DollarSign, Eye, Award } from 'lucide-react';
import { downloadInvoice } from '../utils/invoice';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState(null);
  const { user: loggedInUser } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await orderAPI.getMyOrders();
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    const reason = window.prompt("Enter reason for cancellation (optional):", "Student cancelled");
    if (reason === null) return; 
    
    try {
      await orderAPI.cancel(orderId, reason || 'Cancelled by student');
      alert("Order cancelled successfully!");
      const { data } = await orderAPI.getMyOrders();
      setOrders(data);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to cancel order");
    }
  };

  const handleDownloadInvoice = async (order) => {
    await downloadInvoice(order, loggedInUser);
  };

  const handleReorder = async (order) => {
    setReorderingId(order._id);
    try {
      let successCount = 0;
      for (const item of order.items) {
        const productId = item.product?._id || item.product;
        if (productId) {
          const res = await addToCart(productId, item.quantity);
          if (res.success) {
            successCount++;
          }
        }
      }
      if (successCount > 0) {
        navigate('/cart');
      } else {
        alert("Could not reorder any items. They might be out of stock.");
      }
    } catch (error) {
      console.error('Error reordering items:', error);
      alert("An error occurred during reorder.");
    } finally {
      setReorderingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
      case 'Pending Payment':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'Payment Pending Verification':
      case 'Pending Verification':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Confirmed':
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Packed':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Out for Delivery':
        return 'bg-amber-55 text-amber-700 border-amber-100';
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Cancelled':
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Delivery Failed':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-650 border-slate-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Verification Pending':
      case 'Pending Verification':
      case 'Payment Pending Verification':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Pending':
      case 'Pending Payment':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Failed':
      case 'Rejected':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'Refunded':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 bg-slate-50/50">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary-600 animate-spin"></div>
        </div>
        <p className="text-xs font-bold text-slate-450 animate-pulse uppercase tracking-wider">Syncing orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6 animate-slide-up select-none">
        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border border-emerald-100/50">
          📦
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">No Orders Yet</h2>
          <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed font-bold uppercase">
            Order soft drinks, fresh fruits, snacks & study supplies!
          </p>
        </div>
        <Link to="/products" className="bg-primary-600 hover:bg-primary-750 text-white font-black px-6 py-3 rounded-xl inline-flex items-center gap-1.5 text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all">
          <ShoppingBag size={14} />
          <span>Browse Products</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary-600 rounded-full block"></span>
            My Orders
          </h1>
          <p className="text-[10px] text-slate-455 font-bold uppercase mt-1">Track room dispatch logs & verify OTP codes</p>
        </div>
        <Link 
          to="/products" 
          className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl transition-all border border-emerald-100/50 shadow-sm"
        >
          <ShoppingBag size={12} className="mr-1.5" />
          <span>Shop Essentials</span>
        </Link>
      </div>

      <div className="space-y-5">
        {orders.map((order) => (
          <div
            key={order._id}
            className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden hover:border-emerald-150 transition-all duration-300 p-5 sm:p-6 space-y-5"
          >
            {/* Header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 pb-4 select-none">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">ORDER PLACED</span>
                  <span className="font-extrabold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Calendar size={12} className="text-slate-400" />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                </div>
                
                <div>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">GRAND TOTAL</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">₹{order.totalAmount}</span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">PAYMENT</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-black text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                      {order.paymentMethod}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider shadow-sm ${getStatusColor(order.orderStatus)}`}>
                  {order.orderStatus}
                </span>
              </div>
            </div>

            {/* List of items ordered */}
            <div className="space-y-3.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs gap-3">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 h-5 rounded bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-750 text-[10px] select-none">
                      {item.quantity}
                    </span>
                    <span className="text-slate-750 font-bold truncate max-w-sm">{item.name}</span>
                  </div>
                  <span className="font-black text-slate-800 shrink-0">₹{Math.round(item.price * (1 - (item.discount || 0)/100)) * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Actions panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-50 pt-4">
              <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider select-none">
                SLOT: {order.deliverySlot}
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  to={`/orders/${order._id}`}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-655 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                >
                  <Eye size={12} />
                  <span>Track Status</span>
                </Link>

                <button
                  onClick={() => handleDownloadInvoice(order)}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-655 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                >
                  Invoice
                </button>

                <button
                  onClick={() => handleReorder(order)}
                  disabled={reorderingId === order._id}
                  className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-750 text-white text-xs font-black rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-40"
                >
                  {reorderingId === order._id ? 'Reordering...' : 'Reorder'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;
