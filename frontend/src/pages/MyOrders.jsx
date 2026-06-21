import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Truck, Calendar, DollarSign, Eye } from 'lucide-react';

const loadJsPDF = () => {
  return new Promise((resolve) => {
    if (window.jspdf) {
      resolve(window.jspdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      resolve(window.jspdf);
    };
    document.head.appendChild(script);
  });
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: loggedInUser } = useAuth();

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
    try {
      const jspdfModule = await loadJsPDF();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Colors
      const primaryColor = '#4f46e5'; 
      const darkColor = '#1e293b'; 
      const lightColor = '#f8fafc'; 

      // Header Banner
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor('#ffffff');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('HOSTELKART', 15, 23);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Daily Hostel Essentials Delivered to Your Room', 15, 29);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 160, 23);

      // Metadata
      doc.setTextColor(darkColor);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Order ID:', 15, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(`#${order._id.toUpperCase()}`, 45, 50);

      doc.setFont('helvetica', 'bold');
      doc.text('Date:', 15, 56);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(order.createdAt).toLocaleString(), 45, 56);

      doc.setFont('helvetica', 'bold');
      doc.text('Payment Method:', 15, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(order.paymentMethod, 45, 62);

      doc.setFont('helvetica', 'bold');
      doc.text('Payment Status:', 15, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(order.paymentStatus, 45, 68);

      // Customer Details
      doc.setFont('helvetica', 'bold');
      doc.text('Customer Name:', 115, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(loggedInUser?.name || 'Student', 150, 50);

      doc.setFont('helvetica', 'bold');
      doc.text('Phone Number:', 115, 56);
      doc.setFont('helvetica', 'normal');
      doc.text(order.deliveryDetails?.phone || 'N/A', 150, 56);

      doc.setFont('helvetica', 'bold');
      doc.text('Delivery Address:', 115, 62);
      doc.setFont('helvetica', 'normal');
      const address = `${order.deliveryDetails?.hostelName}, Block ${order.deliveryDetails?.block}, Room ${order.deliveryDetails?.roomNumber}`;
      doc.text(address, 150, 62, { maxWidth: 50 });

      // Table Header
      let y = 85;
      doc.setFillColor(lightColor);
      doc.rect(15, y, 180, 8, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Items Summary', 20, y + 5.5);
      doc.text('Qty', 120, y + 5.5);
      doc.text('Unit Price', 145, y + 5.5);
      doc.text('Total', 175, y + 5.5);
      
      y += 8;

      // Items rows
      doc.setFont('helvetica', 'normal');
      order.items.forEach((item) => {
        const discount = item.discount || 0;
        const discountedPrice = Math.round(item.price * (1 - discount / 100));
        const itemTotal = discountedPrice * item.quantity;
        
        doc.text(item.name, 20, y + 6);
        doc.text(item.quantity.toString(), 120, y + 6);
        doc.text(`INR ${discountedPrice}`, 145, y + 6);
        doc.text(`INR ${itemTotal}`, 175, y + 6);
        
        y += 10;
      });

      // Divider line
      doc.setDrawColor('#e2e8f0');
      doc.line(15, y, 195, y);
      y += 5;

      // Fees breakdown
      doc.setFontSize(9);
      doc.text('Platform Fee:', 130, y + 5);
      doc.text(`INR ${order.platformFee !== undefined ? order.platformFee : 15}`, 175, y + 5);
      
      y += 6;
      doc.text('Delivery Charge:', 130, y + 5);
      doc.text(order.deliveryCharge === 0 ? 'FREE' : `INR ${order.deliveryCharge}`, 175, y + 5);
      
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', 130, y + 5);
      doc.text(`INR ${order.totalAmount}`, 175, y + 5);

      // Invoice footer info
      doc.setTextColor('#94a3b8');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for choosing HostelKart!', 105, 280, { align: 'center' });
      doc.text('For queries or support, reach out at supporthostelkart@gmail.com', 105, 284, { align: 'center' });

      // Save PDF document
      doc.save(`HostelKart_Invoice_${order._id.substring(12).toUpperCase()}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF invoice.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Packed':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Out for Delivery':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'Delivery Failed':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Verification Pending':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Failed':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'Refunded':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6 animate-slide-up">
        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto text-4xl">
          📦
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800">No Orders Found</h2>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          You haven't placed any room orders on HostelKart yet. Start ordering essentials now!
        </p>
        <Link to="/products" className="btn-primary py-3 px-6 inline-flex items-center space-x-2">
          <ShoppingBag size={18} />
          <span>Shop Essentials</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">My Room Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Track live delivery status and view past order history</p>
        </div>
        <Link 
          to="/products" 
          className="inline-flex items-center justify-center bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-primary-100/60 w-fit"
        >
          <ShoppingBag size={14} className="mr-1.5" />
          Order More Essentials
        </Link>
      </div>

      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order._id}
            className="bg-white rounded-2xl border border-slate-100/80 shadow-premium overflow-hidden hover:shadow-premium-hover hover:border-slate-200/80 transition-all duration-300 p-5 sm:p-6 space-y-5"
          >
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ORDER PLACED</span>
                  <span className="font-bold text-slate-700 flex items-center space-x-1.5 mt-0.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                </div>
                
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TOTAL AMOUNT</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">₹{order.totalAmount}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">PAYMENT</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {order.paymentMethod}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status styled badge */}
              <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusColor(order.orderStatus)}`}>
                {order.orderStatus}
              </span>
            </div>

            {/* Items details list */}
            <div className="space-y-3">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ITEMS ORDERED</div>
              <div className="space-y-2.5 bg-slate-50/50 rounded-xl p-3 sm:p-4 border border-slate-100">
                {order.items.map((item) => (
                  <div key={item._id} className="flex justify-between items-center text-xs sm:text-sm">
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="font-black text-primary-700 bg-primary-50 rounded-lg px-2 py-0.5 text-xs border border-primary-100/40">
                        {item.quantity}x
                      </span>
                      <span className="text-slate-700 font-semibold truncate">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-900">₹{Math.round(item.price * (1 - (item.discount || 0)/100)) * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancelled / Failed notices */}
            {order.orderStatus === 'Cancelled' && (
              <div className="bg-red-50 p-4 rounded-xl border border-red-100/60 text-xs text-red-700 space-y-1">
                <p className="font-bold flex items-center">
                  <span className="mr-1.5">✕</span> This order has been Cancelled
                </p>
                {order.cancellationReason && (
                  <p className="italic text-slate-500 pl-4 mt-0.5">Reason: "{order.cancellationReason}"</p>
                )}
              </div>
            )}

            {order.orderStatus === 'Delivery Failed' && (
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100/60 text-xs text-rose-700 space-y-1">
                <p className="font-bold flex items-center">
                  <span className="mr-1.5">⚠️</span> Delivery attempt was unsuccessful
                </p>
                {order.cancellationReason && (
                  <p className="italic text-slate-500 pl-4 mt-0.5">Reason: "{order.cancellationReason}"</p>
                )}
              </div>
            )}

            {/* Refund status details */}
            {order.refundStatus && order.refundStatus !== 'NOT_REQUESTED' && (
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/60 text-xs text-blue-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold flex items-center">
                    <span className="mr-1.5">💸</span> Refund Status:
                  </span>
                  <span className="font-black uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                    {order.refundStatus}
                  </span>
                </div>
                {order.refundId && (
                  <p className="font-mono text-[10px] text-slate-500">Refund ID: <strong className="text-slate-700 font-bold">{order.refundId}</strong></p>
                )}
                {order.refundReason && (
                  <p className="italic text-slate-500">Reason: "{order.refundReason}"</p>
                )}
                {order.refundStatus === 'PROCESSING' && (
                  <p className="text-[11px] text-slate-600 font-medium mt-1 leading-normal">
                    ℹ️ Refund is being processed. It will be credited back to your original payment source.
                  </p>
                )}
                {order.refundStatus === 'REFUNDED' && (
                  <p className="text-[11px] text-emerald-700 font-extrabold mt-1">
                    ✓ Refunded successfully!
                  </p>
                )}
                {order.refundStatus === 'FAILED' && (
                  <p className="text-[11px] text-red-650 font-bold mt-1">
                    ✕ Refund transaction failed. Contact hostel support for manual reconciliation.
                  </p>
                )}
              </div>
            )}

            {/* Active OTP info */}
            {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && order.deliveryOtp && (
              <div className="bg-primary-50/40 p-4 rounded-xl border border-primary-100/60 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-700 block">Verification OTP</span>
                  <span className="text-[10px] text-slate-400">Share this code with rider at your door</span>
                </div>
                <span className="font-black text-primary-700 tracking-wider text-sm bg-white border border-primary-100/80 px-3.5 py-1.5 rounded-lg shadow-sm">
                  {order.deliveryOtp}
                </span>
              </div>
            )}

            {/* Actions button footer */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 border-t border-slate-100 gap-3">
              <div>
                {(order.orderStatus === 'Pending' || order.orderStatus === 'Confirmed') && (
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(order._id)}
                    className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl border border-red-200 transition-colors w-full sm:w-auto text-center"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(order)}
                  className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 transition-colors text-center"
                >
                  Download Invoice
                </button>
                <Link
                  to={`/orders/track/${order._id}`}
                  className="btn-primary py-2.5 px-5 text-xs flex items-center justify-center space-x-1.5 font-bold shadow-sm"
                >
                  <Truck size={14} />
                  <span>Track Live Delivery</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;
