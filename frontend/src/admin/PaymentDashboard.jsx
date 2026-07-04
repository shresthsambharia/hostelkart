import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, Search, Calendar, AlertCircle, CheckCircle, XCircle, 
  RefreshCw, ZoomIn, ZoomOut, Download, AlertTriangle, Info, MapPin, Phone, User
} from 'lucide-react';

const PaymentDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [hostel, setHostel] = useState('');
  const [date, setDate] = useState('');

  // Modals / Overlays
  const [zoomImg, setZoomImg] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [refundOrder, setRefundOrder] = useState(null);
  const [actionOrder, setActionOrder] = useState(null); // For Reject or Info
  const [actionType, setActionType] = useState(''); // 'Reject' | 'RequestInfo'
  
  // Dialog Inputs
  const [refundType, setRefundType] = useState('full'); // 'full' | 'partial'
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [actionNote, setActionNote] = useState('');

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      // Fetch analytics
      const { data: analyticsData } = await axios.get('/api/admin/analytics');
      setAnalytics(analyticsData);

      // Fetch filtered orders
      let url = '/api/admin/orders?';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (hostel) params.append('hostel', hostel);
      if (date) params.append('date', date);
      url += params.toString();

      const { data: ordersData } = await axios.get(url);
      
      // Filter out only UPI/Online orders
      const upiOrders = ordersData.filter(o => o.paymentMethod === 'UPI');
      setPayments(upiOrders);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setAlert({ type: 'error', message: 'Failed to load payments data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [search, status, hostel, date]);

  // Timers countdown state
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (orderId) => {
    setAlert({ type: '', message: '' });
    try {
      await axios.put(`/api/admin/orders/${orderId}/payment`, {
        paymentStatus: 'Paid',
        note: 'Approved by admin'
      });
      setAlert({ type: 'success', message: 'Payment approved successfully!' });
      fetchPaymentData();
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Approval failed' });
    }
  };

  const handleOpenActionModal = (order, type) => {
    setActionOrder(order);
    setActionType(type);
    setActionNote('');
  };

  const handleConfirmAction = async () => {
    if (!actionNote.trim()) {
      alert('Please enter a note / reason.');
      return;
    }
    setAlert({ type: '', message: '' });
    const targetStatus = actionType === 'Reject' ? 'Rejected' : 'Request Info';
    try {
      await axios.put(`/api/admin/orders/${actionOrder._id}/payment`, {
        paymentStatus: targetStatus,
        note: actionNote
      });
      setAlert({ type: 'success', message: `Order payment marked as ${targetStatus}` });
      setActionOrder(null);
      fetchPaymentData();
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Action failed' });
    }
  };

  const handleOpenRefundModal = (order) => {
    setRefundOrder(order);
    setRefundType('full');
    
    // Calculate max refundable
    const totalRefunded = (order.refunds || []).reduce((acc, r) => r.status === 'Refunded' ? acc + r.amount : acc, 0);
    const maxRefundable = order.totalAmount - totalRefunded;
    setRefundAmount(maxRefundable.toString());
    setRefundReason('');
    setRefundNotes('');
  };

  const handleConfirmRefund = async () => {
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid refund amount.');
      return;
    }
    setAlert({ type: '', message: '' });
    try {
      await axios.post(`/api/admin/orders/${refundOrder._id}/refund`, {
        amount: amt,
        reason: refundReason,
        internalNotes: refundNotes,
        status: 'Refunded' // Instantly processed
      });
      setAlert({ type: 'success', message: `Refund of ₹${amt} processed successfully!` });
      setRefundOrder(null);
      fetchPaymentData();
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Refund processing failed' });
    }
  };

  const renderTimer = (order) => {
    if (order.paymentStatus !== 'Pending Payment' || !order.paymentExpiresAt) return null;
    const expiry = new Date(order.paymentExpiresAt);
    const diff = expiry - now;
    if (diff <= 0) return <span className="text-red-500 font-bold">Expired</span>;
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return (
      <span className="text-amber-500 font-mono font-bold animate-pulse">
        ⏱️ {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 font-display">Verify UPI Payments</h1>
          <p className="text-sm text-slate-500">Monitor and approve customer screenshot submissions, issue refunds, and track audit logs.</p>
        </div>
        <button 
          onClick={fetchPaymentData}
          className="flex items-center space-x-2 btn-secondary py-2.5 px-4 text-xs font-bold shadow-sm animate-fade-in"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {alert.message && (
        <div className={`p-4 rounded-xl border flex items-start space-x-2 text-sm font-semibold shadow-sm ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
          {alert.type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : <XCircle size={18} className="shrink-0" />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Analytics Cards Grid */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-premium flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Today's Revenue</span>
              <span className="text-2xl font-black text-slate-800">₹{analytics.todayVerifiedRevenue || 0}</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CreditCard size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-premium flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Today's Pending Payments</span>
              <span className="text-2xl font-black text-slate-800">₹{analytics.todayPendingAmount || 0}</span>
              <span className="text-[10px] text-slate-400 block font-semibold">{analytics.todayPendingCount || 0} orders waiting</span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-premium flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Today's Refunds</span>
              <span className="text-2xl font-black text-slate-800">₹{analytics.todayRefundsAmount || 0}</span>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <RefreshCw size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-premium flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Pending Verification</span>
              <span className="text-2xl font-black text-slate-800">{analytics.pendingVerificationCount || 0}</span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Info size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Filters Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-premium grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search customer, phone, UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 w-full text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2.5 w-full text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Payment Statuses</option>
            <option value="Pending Payment">Pending Payment</option>
            <option value="Payment Submitted">Payment Submitted</option>
            <option value="Paid">Paid (Verified)</option>
            <option value="Failed">Failed / Rejected</option>
            <option value="Refund Pending">Refund Pending</option>
            <option value="Refunded">Refunded</option>
            <option value="Payment Expired">Payment Expired</option>
          </select>
        </div>

        <div>
          <input
            type="text"
            placeholder="Filter by Hostel..."
            value={hostel}
            onChange={(e) => setHostel(e.target.value)}
            className="px-4 py-2.5 w-full text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="pl-9 pr-4 py-2.5 w-full text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Order</th>
                <th className="py-4 px-6">Student</th>
                <th className="py-4 px-6">Details</th>
                <th className="py-4 px-6">UTR / Reference</th>
                <th className="py-4 px-6 text-center">Screenshot</th>
                <th className="py-4 px-6 text-center">Status / Timer</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-semibold">
                    No online payments found matching filters.
                  </td>
                </tr>
              ) : (
                payments.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold block text-slate-800">
                        #{order._id.substring(12).toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold flex items-center space-x-1.5 text-slate-800">
                        <User size={14} className="text-slate-400" />
                        <span>{order.user?.name || 'Unknown Student'}</span>
                      </div>
                      <div className="text-xs text-slate-400">{order.user?.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center text-slate-600">
                          <MapPin size={12} className="mr-1 text-slate-400" />
                          <span>{order.deliveryDetails.hostelName}, Room {order.deliveryDetails.roomNumber}</span>
                        </div>
                        <div className="flex items-center text-slate-500 font-medium">
                          <Phone size={12} className="mr-1 text-slate-400" />
                          <span>{order.deliveryDetails.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">
                      <span className="font-bold text-slate-800 block">₹{order.totalAmount}</span>
                      {order.utrNumber ? (
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{order.utrNumber}</span>
                      ) : (
                        <span className="text-slate-400 italic">No UTR submitted</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {order.paymentScreenshot ? (
                        <div className="relative inline-block group">
                          <img 
                            src={order.paymentScreenshot} 
                            alt="Receipt" 
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-85 transition-opacity"
                            onClick={() => {
                              setZoomImg(order.paymentScreenshot);
                              setZoomScale(1);
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-0.5 rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <ZoomIn size={8} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No Upload</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border block w-max mx-auto mb-1 ${
                        order.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : ['Verification Pending', 'Pending Verification', 'Payment Pending Verification', 'Payment Submitted'].includes(order.paymentStatus)
                          ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse'
                          : order.paymentStatus === 'Pending Payment'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {order.paymentStatus}
                      </span>
                      {renderTimer(order)}
                    </td>
                    <td className="py-4 px-6 text-right space-y-1">
                      {/* Approve / Reject Actions */}
                      {['Payment Submitted', 'Pending Verification', 'Verification Pending'].includes(order.paymentStatus) && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(order._id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1 px-3 rounded text-xs transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(order, 'Reject')}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-xs transition-colors shadow-sm"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(order, 'RequestInfo')}
                            className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-1 px-3 rounded text-xs transition-colors shadow-sm"
                          >
                            Info
                          </button>
                        </div>
                      )}

                      {/* Refund Actions */}
                      {order.paymentStatus === 'Paid' && (
                        <button
                          onClick={() => handleOpenRefundModal(order)}
                          className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-1 px-3 rounded text-xs transition-colors shadow-sm"
                        >
                          Issue Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Lightbox Screenshot Zoom Modal --- */}
      {zoomImg && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative overflow-hidden flex flex-col items-center">
            <button 
              onClick={() => setZoomImg(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full p-2.5 transition-colors focus:outline-none"
            >
              <XCircle size={18} />
            </button>
            <h3 className="text-lg font-bold text-slate-800 self-start">Payment Screenshot</h3>
            
            <div className="w-full h-80 border border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-50 relative">
              <img 
                src={zoomImg} 
                alt="Receipt Full" 
                className="max-h-full max-w-full object-contain"
                style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.15s ease-out' }}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full">
              <button 
                onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.25))}
                className="flex-1 btn-secondary py-2 flex items-center justify-center space-x-1.5 text-xs font-bold"
              >
                <ZoomOut size={14} />
                <span>Zoom Out</span>
              </button>
              <button 
                onClick={() => setZoomScale(prev => Math.min(3, prev + 0.25))}
                className="flex-1 btn-secondary py-2 flex items-center justify-center space-x-1.5 text-xs font-bold"
              >
                <ZoomIn size={14} />
                <span>Zoom In</span>
              </button>
              <a 
                href={zoomImg} 
                download={`receipt_${Date.now()}.webp`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 btn-primary py-2 flex items-center justify-center space-x-1.5 text-xs font-bold text-white"
              >
                <Download size={14} />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- Action / Rejection / Info Modal --- */}
      {actionOrder && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800">
              {actionType === 'Reject' ? 'Reject Payment Verification' : 'Request More Payment Information'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {actionType === 'Reject' 
                ? 'Specify the rejection reason. The order status will automatically transition to Cancelled and reserved stocks will be restored.'
                : 'Enter a detailed request message for the student. The message will be displayed on their order tracking page.'}
            </p>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Reason / Message</label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Type here..."
                rows="3"
                className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActionOrder(null)}
                className="flex-1 btn-secondary py-2.5 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 font-bold text-white rounded-xl ${actionType === 'Reject' ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-600 hover:bg-slate-700'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Issue Refund Modal --- */}
      {refundOrder && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800">Issue Refund</h3>
            
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRefundType('full');
                  const totalRefunded = (refundOrder.refunds || []).reduce((acc, r) => r.status === 'Refunded' ? acc + r.amount : acc, 0);
                  setRefundAmount((refundOrder.totalAmount - totalRefunded).toString());
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${refundType === 'full' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Full Refund
              </button>
              <button
                type="button"
                onClick={() => setRefundType('partial')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${refundType === 'partial' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Partial Refund
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Refund Amount (₹)</label>
                <input
                  type="number"
                  disabled={refundType === 'full'}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Reason for Customer</label>
                <input
                  type="text"
                  placeholder="e.g. Out of stock items, customer cancelled"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Internal Admin Notes</label>
                <textarea
                  placeholder="Private notes for staff..."
                  rows="2"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRefundOrder(null)}
                className="flex-1 btn-secondary py-2.5 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRefund}
                className="flex-1 btn-primary py-2.5 font-bold text-white"
              >
                Issue Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentDashboard;
