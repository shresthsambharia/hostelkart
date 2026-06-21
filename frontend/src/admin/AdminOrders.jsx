import React, { useState, useEffect } from 'react';
import { adminAPI, paymentAPI } from '../api';
import { Truck, CheckCircle2, AlertCircle, ShoppingCart, Calendar, Search } from 'lucide-react';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'delivered' | 'cancelled'
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredOrders = orders.filter((ord) => {
    const isActive = ['Pending', 'Confirmed', 'Packed', 'Out for Delivery'].includes(ord.orderStatus);
    const isDelivered = ord.orderStatus === 'Delivered';
    const isCancelled = ord.orderStatus === 'Cancelled';
    const isFailed = ord.orderStatus === 'Delivery Failed';

    if (activeTab === 'active' && !isActive) return false;
    if (activeTab === 'delivered' && !isDelivered) return false;
    if (activeTab === 'cancelled' && !isCancelled) return false;
    if (activeTab === 'failed' && !isFailed) return false;

    // Search query check
    const query = search.toLowerCase();
    const orderId = ord._id.toLowerCase();
    const studentName = (ord.user?.name || '').toLowerCase();
    const hostel = (ord.deliveryDetails?.hostelName || '').toLowerCase();
    const phone = (ord.deliveryDetails?.phone || '').toLowerCase();
    const matchesSearch = 
      query === '' ||
      orderId.includes(query) ||
      studentName.includes(query) ||
      hostel.includes(query) ||
      phone.includes(query);

    if (!matchesSearch) return false;

    // Date range filter
    const orderDate = new Date(ord.createdAt);
    orderDate.setHours(0,0,0,0);
    const start = startDate ? new Date(startDate) : null;
    if (start) start.setHours(0,0,0,0);
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(0,0,0,0);

    const matchesDate = 
      (!start || orderDate >= start) &&
      (!end || orderDate <= end);

    return matchesDate;
  });

  const fetchOrdersAndRiders = async () => {
    try {
      const ordRes = await adminAPI.getAllOrders();
      setOrders(ordRes.data);

      const riderRes = await adminAPI.getDeliveryPartners();
      setRiders(riderRes.data);
    } catch (error) {
      console.error('Error loading orders overview details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndRiders();
  }, []);

  const handleAssignRider = async (orderId, riderId) => {
    if (!riderId) return;
    setAlert({ type: '', message: '' });
    try {
      await adminAPI.assignDeliveryPartner(orderId, riderId);
      setAlert({ type: 'success', message: 'Delivery partner assigned successfully' });
      fetchOrdersAndRiders();
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Assignment failed' });
    }
  };

  const handleStatusChange = async (orderId, status) => {
    setAlert({ type: '', message: '' });
    try {
      await adminAPI.updateOrderStatus(orderId, status);
      setAlert({ type: 'success', message: `Order status updated to ${status}` });
      fetchOrdersAndRiders();
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Status change failed' });
    }
  };

  const handlePaymentStatusChange = async (orderId, paymentStatus) => {
    setAlert({ type: '', message: '' });
    try {
      await adminAPI.updateOrderPaymentStatus(orderId, paymentStatus);
      setAlert({
        type: 'success',
        message: `Payment status updated to ${paymentStatus}. ${paymentStatus === 'Failed' ? 'Order automatically cancelled.' : ''}`
      });
      fetchOrdersAndRiders();
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Payment status change failed' });
    }
  };

  const handleTriggerRefund = async (orderId) => {
    const reason = window.prompt("Enter reason for manual refund:", "Refund processed by Admin");
    if (reason === null) return;

    setAlert({ type: '', message: '' });
    try {
      await paymentAPI.refund(orderId, reason || 'Admin manual refund');
      setAlert({ type: 'success', message: 'Refund successfully completed!' });
      fetchOrdersAndRiders();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Failed to request refund'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Confirmed': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Packed': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Out for Delivery': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Delivered': return 'bg-emerald-50 text-emerald-705 border-emerald-100';
      case 'Cancelled': return 'bg-red-50 text-red-700 border-red-100';
      case 'Delivery Failed': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-105 text-slate-600';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Verification Pending': return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Pending': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'Failed': return 'bg-red-50 text-red-700 border border-red-100';
      case 'Refunded': return 'bg-blue-50 text-blue-700 border border-blue-100';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6 p-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manage Room Orders</h1>
        <p className="text-sm text-slate-500">Track student orders, dispatch riders, and update tracking timelines</p>
      </div>

      {/* Alert banner */}
      {alert.message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-2 text-sm ${
          alert.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap">
        {[
          { key: 'active', label: 'Active Orders', count: orders.filter(o => ['Pending', 'Confirmed', 'Packed', 'Out for Delivery'].includes(o.orderStatus)).length },
          { key: 'delivered', label: 'Delivered Archive', count: orders.filter(o => o.orderStatus === 'Delivered').length },
          { key: 'cancelled', label: 'Cancelled Ledger', count: orders.filter(o => o.orderStatus === 'Cancelled').length },
          { key: 'failed', label: 'Failed Deliveries', count: orders.filter(o => o.orderStatus === 'Delivery Failed').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all inline-block shrink-0 ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Date & Search Filter Console */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Search student, hostel, room, phone..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">From:</span>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">To:</span>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Orders list table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/4"></div>
            <div className="h-24 bg-slate-50 rounded"></div>
          </div>
        ) : orders.length === 0 ? (
          <p className="text-slate-400 italic text-center py-12 text-sm">No orders recorded in server database.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Hostel & Room Address</th>
                  <th className="p-4">Items Summary</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment & Refund</th>
                  <th className="p-4">Assign Rider</th>
                  <th className="p-4">Change Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
                {filteredOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/30 transition-colors">
                    {/* Order ID & Date */}
                    <td className="p-4">
                      <span className="font-mono font-bold text-slate-800 block">
                        #{ord._id.substring(12).toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1.5 mt-1 leading-none">
                        <Calendar size={10} />
                        <span>{new Date(ord.createdAt).toLocaleDateString()} at {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </td>

                    {/* Student user */}
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">{ord.user?.name || 'Deleted User'}</span>
                      <span className="text-slate-400 text-[10px] block">{ord.user?.email}</span>
                    </td>

                    {/* Address details */}
                    <td className="p-4 max-w-sm">
                      <span className="font-bold text-slate-700 block">{ord.deliveryDetails?.hostelName}</span>
                      <span className="text-slate-500 text-[10px] block font-semibold leading-normal">
                        Block {ord.deliveryDetails?.block}, Room {ord.deliveryDetails?.roomNumber} (Floor {ord.deliveryDetails?.floor})
                      </span>
                      {ord.deliveryDetails?.landmark && (
                        <span className="text-slate-400 text-[10px] block italic leading-normal">
                          Landmark: {ord.deliveryDetails?.landmark}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-slate-500 text-[10px] font-semibold mt-1">
                        <span className="text-primary-600 font-bold">📞 {ord.deliveryDetails?.phone}</span>
                        {ord.deliveryDetails?.alternatePhone && (
                          <span className="text-slate-400 font-bold">Alt: {ord.deliveryDetails?.alternatePhone}</span>
                        )}
                      </div>
                      <div className="text-[10px] mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-400 font-normal">
                        <span className="font-bold text-slate-600 block mb-0.5">Time Slot: {ord.deliverySlot}</span>
                        {ord.deliveryDetails?.deliveryInstructions && (
                          <span className="italic">Inst: {ord.deliveryDetails?.deliveryInstructions}</span>
                        )}
                      </div>
                    </td>

                    {/* Items compact description */}
                    <td className="p-4 max-w-xs">
                      <div className="space-y-1">
                        {ord.items.map((it) => (
                          <div key={it._id} className="truncate text-slate-500 font-semibold">
                            <span className="text-slate-800 font-extrabold">{it.quantity}x</span> {it.name}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Pay amount details */}
                    <td className="p-4">
                      <span className="font-extrabold text-slate-800 block">₹{ord.totalAmount}</span>
                      <span className="text-[10px] text-slate-500 font-bold block mt-1 leading-none">{ord.paymentMethod}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1 ${getPaymentStatusColor(ord.paymentStatus)}`}>
                        {ord.paymentStatus}
                      </span>
                      {ord.utrNumber && (
                        <span className="text-[9px] text-slate-600 block mt-1 font-mono font-bold leading-none bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                          UTR: {ord.utrNumber}
                        </span>
                      )}
                      {ord.paymentStatus === 'Verification Pending' && (
                        <div className="flex flex-col gap-1 mt-2">
                          <button
                            type="button"
                            onClick={() => handlePaymentStatusChange(ord._id, 'Paid')}
                            className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-1.5 rounded text-[9px] shadow-sm transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePaymentStatusChange(ord._id, 'Failed')}
                            className="w-full text-center bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-1.5 rounded text-[9px] shadow-sm transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Payment & Refund Details */}
                    <td className="p-4 max-w-xs">
                      {['ONLINE', 'RAZORPAY'].includes(ord.paymentMethod) ? (
                        <div className="space-y-1.5 text-[11px]">
                          {ord.razorpayPaymentId && (
                            <p className="font-semibold text-slate-700">
                              Payment ID: <span className="font-mono text-slate-500 font-bold block">{ord.razorpayPaymentId}</span>
                            </p>
                          )}
                          
                          {/* Refund Status display */}
                          {ord.refundStatus && ord.refundStatus !== 'NOT_REQUESTED' && (
                            <div className="space-y-1 bg-slate-50 p-2 rounded border border-slate-100 shadow-sm leading-normal">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-bold block">REFUND</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  ord.refundStatus === 'REFUNDED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.refundStatus === 'FAILED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {ord.refundStatus}
                                </span>
                              </div>
                              {ord.refundId && (
                                <p className="font-mono text-[9px] text-slate-500 truncate block" title={ord.refundId}>
                                  ID: {ord.refundId}
                                </p>
                              )}
                              {ord.refundReason && (
                                <p className="text-[9px] text-slate-400 italic block">
                                  Reason: "{ord.refundReason}"
                                </p>
                              )}
                              {ord.refundedAt && (
                                <p className="text-[9px] text-slate-450 block leading-none">
                                  Date: {new Date(ord.refundedAt).toLocaleDateString()}
                                </p>
                              )}
                              {ord.refundStatus === 'FAILED' && ord.refundError && (
                                <p className="text-[9px] text-red-650 block leading-normal italic font-semibold">
                                  Error: {ord.refundError}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Refund manual action button */}
                          {ord.paymentStatus === 'Paid' && (!ord.refundStatus || ['NOT_REQUESTED', 'FAILED'].includes(ord.refundStatus)) && (
                            <button
                              type="button"
                              onClick={() => handleTriggerRefund(ord._id)}
                              className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-1.5 rounded text-[9px] shadow-sm transition-colors mt-1"
                            >
                              {ord.refundStatus === 'FAILED' ? 'Retry Refund' : 'Refund Order'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">N/A (COD Order)</span>
                      )}
                    </td>

                    {/* Delivery Partner Assigner Dropdown */}
                    <td className="p-4">
                      {activeTab !== 'active' ? (
                        <span className="text-slate-400 text-[10px]">
                          {ord.deliveryPartner?.name || 'Unassigned'}
                        </span>
                      ) : ord.orderStatus === 'Cancelled' ? (
                        <span className="text-slate-400 text-[10px]">N/A (Cancelled)</span>
                      ) : (
                        <select
                          className="border border-slate-200 rounded p-1 text-[11px] font-bold bg-white text-slate-700 outline-none focus:border-primary-500 w-36"
                          value={ord.deliveryPartner?._id || ''}
                          onChange={(e) => handleAssignRider(ord._id, e.target.value)}
                        >
                          <option value="">-- Choose Rider --</option>
                          {riders.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Change Status Dropdown */}
                    <td className="p-4">
                      <div className="space-y-2">
                        {/* Status Label */}
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold block w-fit ${getStatusColor(ord.orderStatus)}`}>
                          {ord.orderStatus}
                        </span>

                        {activeTab === 'active' && (
                          <select
                            className="border border-slate-200 rounded p-1 text-[11px] font-bold bg-white text-slate-700 outline-none focus:border-primary-500 w-32"
                            value={ord.orderStatus}
                            onChange={(e) => handleStatusChange(ord._id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Packed">Packed</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        )}

                        {activeTab === 'delivered' && (
                          <div className="text-[10px] text-slate-400">
                            {ord.deliveredAt ? (
                              <span>Delivered: {new Date(ord.deliveredAt).toLocaleDateString()}</span>
                            ) : (
                              <span>Updated: {new Date(ord.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}

                        {activeTab === 'cancelled' && (
                          <div className="text-[10px] text-slate-500 leading-normal space-y-1 bg-red-50/50 p-2 rounded border border-red-100/50 max-w-[155px]">
                            <span className="font-bold text-red-700 block">
                              By: {ord.cancellationReason?.toLowerCase().includes('student') ? 'Student' : 'Admin/System'}
                            </span>
                            <span className="italic block break-words">Reason: "{ord.cancellationReason || 'N/A'}"</span>
                            <span className="text-[9px] text-slate-450 block">
                              Time: {ord.cancelledAt ? new Date(ord.cancelledAt).toLocaleTimeString() : new Date(ord.updatedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
