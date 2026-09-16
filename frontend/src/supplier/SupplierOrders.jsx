import React, { useState, useEffect } from 'react';
import { supplierAPI } from '../api';
import {
  ClipboardList, Package, MapPin, Calendar, CheckCircle,
  Clock, AlertTriangle, RefreshCw, ShoppingCart, Truck
} from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/image';

const SupplierOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supplierAPI.getOrders();
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load supply orders:', err);
      setError(err.response?.data?.message || 'Failed to load supply orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.orderStatus === statusFilter;
  });

  const totalDelivered = orders.filter(o => o.orderStatus === 'Delivered').length;
  const totalPending = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.orderStatus)).length;
  const totalSupplyEarnings = orders
    .filter(o => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (o.supplierSubtotal || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-premium-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            <span>Supply Orders & Fulfillment</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Track student orders containing your catalog products and their corridor delivery statuses.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all font-bold text-xs flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Supply Orders</span>
          <div className="text-2xl font-black text-slate-800">{orders.length}</div>
          <span className="text-[10px] font-bold text-slate-400">Total matched student orders</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active / In-Transit</span>
          <div className="text-2xl font-black text-amber-600">{totalPending}</div>
          <span className="text-[10px] font-bold text-amber-700">Currently in packing or dispatch</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Fulfilled Sales Value</span>
          <div className="text-2xl font-black text-emerald-600">₹{totalSupplyEarnings.toLocaleString()}</div>
          <span className="text-[10px] font-bold text-emerald-700">{totalDelivered} completed room deliveries</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-premium-sm">
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Orders ({orders.length})</option>
            <option value="Placed">Placed</option>
            <option value="Processing">Processing / Packed</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <span className="text-xs font-bold text-slate-400">
          Showing {filteredOrders.length} of {orders.length}
        </span>
      </div>

      {/* Orders List */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold text-xs flex items-center justify-center gap-2 bg-white rounded-3xl border border-slate-100">
          <RefreshCw size={16} className="animate-spin text-purple-600" />
          <span>Loading supply orders...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-100 shadow-premium-sm">
          <ShoppingCart size={36} className="mx-auto text-slate-300" />
          <p className="text-slate-400 text-xs font-bold">No supply orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isDelivered = order.orderStatus === 'Delivered';
            const isCancelled = order.orderStatus === 'Cancelled';
            const isOut = order.orderStatus === 'Out for Delivery';

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl border border-slate-100 shadow-premium p-6 space-y-4 hover:border-slate-200 transition-all"
              >
                {/* Order Meta Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-xs text-slate-800">
                      Order #{order._id.substring(12).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Calendar size={11} />
                      <span>{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                      isDelivered
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isCancelled
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isOut
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {order.orderStatus}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                      order.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Delivery Location Pointer */}
                {order.deliveryDetails && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <MapPin size={14} className="text-emerald-600 shrink-0" />
                    <span>
                      Delivery to <strong className="text-slate-800">{order.deliveryDetails.hostelName || 'Hostel'}</strong>
                      {order.deliveryDetails.block && ` • Block ${order.deliveryDetails.block}`}
                      {order.deliveryDetails.roomNumber && ` • Room ${order.deliveryDetails.roomNumber}`}
                    </span>
                  </div>
                )}

                {/* Supplied Items List */}
                <div className="divide-y divide-slate-50">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs">
                          {item.quantity}x
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">₹{item.price} each</p>
                        </div>
                      </div>
                      <div className="font-black text-slate-800">
                        ₹{(item.price || 0) * (item.quantity || 1)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer with Subtotal */}
                <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-xs">
                  <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider">Your Item Subtotal</span>
                  <span className="font-black text-slate-900 text-sm">₹{order.supplierSubtotal}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupplierOrders;
