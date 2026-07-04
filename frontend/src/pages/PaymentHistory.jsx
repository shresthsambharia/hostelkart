import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { CreditCard, Calendar, ArrowLeft, RefreshCw, CheckCircle, Clock, AlertCircle, HelpCircle } from 'lucide-react';

const PaymentHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.get('/api/orders/payment-history');
      setHistory(data);
    } catch (err) {
      console.error('Error fetching student payment history:', err);
      setError('Failed to retrieve payment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid':
      case 'Verified':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Payment Submitted':
      case 'Pending Verification':
        return 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse';
      case 'Pending Payment':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Refunded':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Refund Pending':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Failed':
      case 'Rejected':
      case 'Payment Expired':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <Link 
            to="/profile" 
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 font-display">UPI Payment History</h1>
            <p className="text-xs text-slate-400">Track verification status and refund logs for online payments.</p>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center space-x-2 btn-secondary py-2 px-3 text-xs font-bold shadow-sm"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-premium text-center space-y-4">
          <div className="p-4 bg-slate-50 rounded-full w-max mx-auto text-slate-400">
            <CreditCard size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-700">No online payments found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Any orders placed using the Pay Online (UPI / QR Code) method will be tracked here.
            </p>
          </div>
          <Link to="/products" className="btn-primary py-2.5 px-6 inline-block text-sm font-bold text-white shadow-md">
            Order Essentials Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((order) => {
            const refundTotal = (order.refunds || []).reduce((acc, r) => r.status === 'Refunded' ? acc + r.amount : acc, 0);
            const activeRefund = (order.refunds || []).find(r => ['Pending', 'Processing', 'Refunded'].includes(r.status));
            
            return (
              <div 
                key={order._id} 
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-4 hover:shadow-hover transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-800">
                        Order #{order._id.substring(12).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${getStatusStyle(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                    <div className="flex items-center text-[10px] text-slate-400 font-semibold space-x-1">
                      <Calendar size={10} />
                      <span>{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-slate-400 font-bold block">Total Amount</span>
                    <span className="text-base font-black text-slate-800">₹{order.totalAmount}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payment Details</span>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-slate-600">
                      <div>
                        <strong>Method:</strong> {order.paymentMethod}
                      </div>
                      <div>
                        <strong>UTR / Ref No:</strong> {order.utrNumber ? <code className="font-mono font-bold bg-white border border-slate-150 px-1 py-0.5 rounded text-slate-700">{order.utrNumber}</code> : <span className="italic text-slate-400">Awaiting UTR submission</span>}
                      </div>
                    </div>
                  </div>

                  {/* Refund History Panel */}
                  {activeRefund && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-purple-700">Refund Status details</span>
                      <div className="bg-purple-50/40 p-3 rounded-xl border border-purple-100/40 space-y-1 text-slate-600">
                        <div>
                          <strong>Refund Status:</strong> <span className="text-purple-700 font-bold capitalize">{activeRefund.status}</span>
                        </div>
                        <div>
                          <strong>Refund Amount:</strong> <span className="text-purple-700 font-bold">₹{activeRefund.amount}</span>
                        </div>
                        {activeRefund.reason && (
                          <div>
                            <strong>Reason:</strong> {activeRefund.reason}
                          </div>
                        )}
                        <div>
                          <strong>Date:</strong> {new Date(activeRefund.refundDate || activeRefund.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Link 
                    to={`/orders/track/${order._id}`}
                    className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center"
                  >
                    <span>View Track Details</span>
                    <span className="ml-1">&rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
