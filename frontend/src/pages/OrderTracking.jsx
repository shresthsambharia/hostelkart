import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Truck, Check, MapPin, Phone, User, Calendar, ShieldCheck, ChevronLeft, ClipboardList, Package, CheckCircle } from 'lucide-react';

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

const OrderTracking = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: loggedInUser } = useAuth();

  const fetchOrderDetails = async () => {
    try {
      const { data } = await orderAPI.getById(id);
      setOrder(data);
    } catch (error) {
      console.error('Error loading order tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    const reason = window.prompt("Enter reason for cancellation (optional):", "Student cancelled");
    if (reason === null) return;
    
    try {
      await orderAPI.cancel(id, reason || 'Cancelled by student');
      alert("Order cancelled successfully!");
      fetchOrderDetails();
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

  useEffect(() => {
    fetchOrderDetails();
    
    // Set up polling interval to check for status updates every 10 seconds
    const interval = setInterval(fetchOrderDetails, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Order Not Found</h2>
        <p className="text-slate-500">We couldn't retrieve tracking data for this Order ID.</p>
        <Link to="/myorders" className="btn-primary py-2 px-6 inline-block">Back to My Orders</Link>
      </div>
    );
  }

  // Helper list of tracking steps
  const steps = [
    { name: 'Pending', label: 'Order Placed', desc: 'Awaiting shop confirmation' },
    { name: 'Confirmed', label: 'Confirmed', desc: 'Rider assigned to order' },
    { name: 'Packed', label: 'Packed', desc: 'Prepared at store counter' },
    { name: 'Out for Delivery', label: 'Out for Delivery', desc: 'Rider en-route to your room' },
    { name: 'Delivered', label: 'Delivered', desc: 'Order arrived safely' }
  ];

  const getStepIndex = (status) => {
    if (status === 'Cancelled') return -1;
    return steps.findIndex(x => x.name === status);
  };

  const currentStepIdx = getStepIndex(order.orderStatus);

  const getStepIcon = (name, isCompleted) => {
    const size = 13;
    const color = isCompleted ? "text-white stroke-[2.5]" : "text-slate-400 stroke-[2]";
    switch (name) {
      case 'Pending':
        return <ClipboardList size={size} className={color} />;
      case 'Confirmed':
        return <ShieldCheck size={size} className={color} />;
      case 'Packed':
        return <Package size={size} className={color} />;
      case 'Out for Delivery':
        return <Truck size={size} className={color} />;
      case 'Delivered':
        return <CheckCircle size={size} className={color} />;
      default:
        return <Check size={size} className={color} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link to="/myorders" className="inline-flex items-center space-x-1.5 text-sm font-bold text-slate-500 hover:text-primary-600">
          <ChevronLeft size={16} />
          <span>Back to My Orders</span>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">TRACKING ROOM DELIVERY</span>
          <h1 className="text-xl font-extrabold text-slate-800">Order #{order._id.substring(12).toUpperCase()}</h1>
          <p className="text-xs text-slate-500 flex items-center space-x-1.5">
            <Calendar size={12} />
            <span>Placed: {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 font-bold block uppercase">Total Pay</span>
          <span className="text-xl font-extrabold text-slate-800">₹{order.totalAmount}</span>
        </div>
      </div>

      {/* Action panel card */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleDownloadInvoice(order)}
            className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl border border-slate-200 transition-colors shadow-sm"
          >
            Download Invoice PDF
          </button>
        </div>

        <div>
          {(order.orderStatus === 'Pending' || order.orderStatus === 'Confirmed') && (
            <button
              type="button"
              onClick={handleCancelOrder}
              className="text-xs font-bold text-red-650 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl border border-red-200 transition-colors shadow-sm"
            >
              Cancel Room Order
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp Community Groups - Show only after successful order placement (i.e. not cancelled/failed) */}
      {order.orderStatus !== 'Cancelled' && order.paymentStatus !== 'FAILED' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-sm">Join Hostel Community Groups</h3>
            <p className="text-xs text-slate-500">Stay updated on delivery timings, stock refills, and special offers in your hostel block!</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://chat.whatsapp.com/DW9mFovIExGBjhLOx9dQYU"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn-primary py-3.5 px-4 min-h-[48px] text-xs font-bold flex items-center justify-center space-x-2 rounded-xl"
            >
              <span>Join Boys Hostel WhatsApp Group</span>
            </a>
            <a
              href="https://chat.whatsapp.com/GWDywmfUeOz2YYix89pk60"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn-secondary py-3.5 px-4 min-h-[48px] text-xs font-bold flex items-center justify-center space-x-2 rounded-xl border border-slate-200"
            >
              <span>Join Girls Hostel WhatsApp Group</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Track Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Timeline column */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-extrabold text-slate-800 text-base border-b border-slate-100 pb-3">
            Live Delivery Timeline
          </h3>

          {order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivery Failed' ? (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-xl text-center space-y-3">
                <h4 className="font-bold text-base">
                  This order has been {order.orderStatus === 'Delivery Failed' ? 'marked as Delivery Failed' : 'Cancelled'}
                </h4>
                {order.cancellationReason && (
                  <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-red-100 max-w-md mx-auto italic">
                    Reason: "{order.cancellationReason}"
                  </p>
                )}
                {['ONLINE', 'RAZORPAY'].includes(order.paymentMethod) && order.paymentStatus === 'Paid' && (
                  <p className="text-xs text-blue-700 font-bold bg-blue-50 border border-blue-100 p-2.5 rounded-lg max-w-md mx-auto animate-pulse mt-2">
                    ⚡ Online prepaid payment detected. Refund is being processed automatically.
                  </p>
                )}
              </div>

              {/* Refund Tracking Timeline */}
              {['ONLINE', 'RAZORPAY'].includes(order.paymentMethod) && order.refundStatus && order.refundStatus !== 'NOT_REQUESTED' && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-6">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    Refund Processing Tracking Timeline
                  </h4>
                  
                  {/* Vertical Steps */}
                  <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {/* Step 1: Paid */}
                    <div className="relative flex flex-col items-start gap-1">
                      <div className="absolute -left-[29px] top-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 font-extrabold">1. Payment Verified (PAID)</h5>
                      <p className="text-[11px] text-slate-500">Transaction ID: {order.razorpayPaymentId}</p>
                    </div>

                    {/* Step 2: Cancelled */}
                    <div className="relative flex flex-col items-start gap-1">
                      <div className="absolute -left-[29px] top-1.5 w-6 h-6 rounded-full bg-red-650 text-white flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 font-extrabold">2. Order Cancelled / Delivery Failed</h5>
                      <p className="text-[11px] text-slate-500">
                        Order was cancelled or delivery failed on {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString() : 'N/A'}.
                      </p>
                    </div>

                    {/* Step 3: Refund Initiated */}
                    {(() => {
                      const isInitiated = ['PROCESSING', 'REFUNDED'].includes(order.refundStatus);
                      return (
                        <div className="relative flex flex-col items-start gap-1">
                          <div className={`absolute -left-[29px] top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                            isInitiated ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-200 text-slate-350'
                          }`}>
                            {isInitiated ? '✓' : '3'}
                          </div>
                          <h5 className={`text-xs font-bold ${isInitiated ? 'text-slate-800 font-extrabold' : 'text-slate-400'}`}>3. Refund Initiated</h5>
                          <p className={`text-[11px] ${isInitiated ? 'text-slate-500' : 'text-slate-400'}`}>
                            Refund request generated and transmitted to Razorpay gateway.
                          </p>
                          {order.refundId && (
                            <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border mt-1">
                              ID: {order.refundId}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Step 4: Refunded */}
                    {(() => {
                      const isRefunded = order.refundStatus === 'REFUNDED';
                      const isFailed = order.refundStatus === 'FAILED';
                      return (
                        <div className="relative flex flex-col items-start gap-1">
                          <div className={`absolute -left-[29px] top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                            isRefunded ? 'bg-emerald-600 border-emerald-600 text-white' : isFailed ? 'bg-red-650 border-red-650 text-white' : 'bg-white border-slate-200 text-slate-350'
                          }`}>
                            {isRefunded ? '✓' : isFailed ? '✕' : '4'}
                          </div>
                          <h5 className={`text-xs font-bold ${isRefunded ? 'text-emerald-700 font-extrabold' : isFailed ? 'text-red-750 font-extrabold' : 'text-slate-400'}`}>
                            {isRefunded ? '4. Refund Completed (REFUNDED)' : isFailed ? '4. Refund Failed' : '4. Refund Credited to Bank'}
                          </h5>
                          <p className={`text-[11px] ${isRefunded || isFailed ? 'text-slate-550 font-semibold' : 'text-slate-450'}`}>
                            {isRefunded 
                              ? `Funds settled back to your original source. Settled on: ${order.refundedAt ? new Date(order.refundedAt).toLocaleDateString() : 'N/A'}`
                              : isFailed
                              ? `Refund failed: "${order.refundError || 'Unknown Error'}"`
                              : 'Amount will be credited within 5-7 working days as per bank/Razorpay terms.'}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Vertical timeline steps */
            <div className="relative pl-10 space-y-8 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={step.name} className="relative flex flex-col items-start gap-1">
                    {/* Circle marker */}
                    <div
                      className={`absolute -left-[35px] top-0 w-7.5 h-7.5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-primary-600 border-primary-600 text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)]'
                          : 'bg-white border-slate-200 text-slate-350'
                      } ${isCurrent ? 'ring-4 ring-primary-100 animate-pulse scale-105' : ''}`}
                      style={{ width: '30px', height: '30px' }}
                    >
                      {getStepIcon(step.name, isCompleted)}
                    </div>

                    <h4 className={`text-sm font-bold leading-none ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </h4>
                    
                    <p className={`text-xs ${isCompleted ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                      {step.desc}
                    </p>

                    {/* Show time note if logged in timeline */}
                    {isCompleted && order.timeline.find(t => t.status === step.name) && (
                      <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded mt-1">
                        {new Date(order.timeline.find(t => t.status === step.name).timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info panel column */}
        <div className="space-y-6">
          {/* Delivery OTP Card */}
          {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && order.deliveryOtp && (
            <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100 shadow-sm space-y-2 text-center animate-pulse">
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block">DELIVERY VERIFICATION OTP</span>
              <span className="text-3xl font-black text-primary-700 tracking-widest block">{order.deliveryOtp}</span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Give this code to the delivery rider at your room door to confirm delivery.
              </p>
            </div>
          )}

          {/* Delivery Address Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center space-x-1.5">
              <MapPin size={16} className="text-primary-600" />
              <span>Room Address</span>
            </h3>
            
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-700">{order.deliveryDetails.hostelName}</p>
              <p>{order.deliveryDetails.block}, {order.deliveryDetails.floor}</p>
              <p>Room No: <span className="font-bold text-slate-800">{order.deliveryDetails.roomNumber}</span></p>
              {order.deliveryDetails.landmark && (
                <p>Landmark: <span className="font-medium text-slate-700">{order.deliveryDetails.landmark}</span></p>
              )}
              <p className="flex items-center space-x-1 pt-1.5 font-bold text-slate-700">
                <Phone size={12} />
                <span>{order.deliveryDetails.phone}</span>
              </p>
              {order.deliveryDetails.alternatePhone && (
                <p className="flex items-center space-x-1 font-semibold text-slate-500">
                  <Phone size={12} />
                  <span>Alt: {order.deliveryDetails.alternatePhone}</span>
                </p>
              )}
              {order.deliveryDetails.deliveryInstructions && (
                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-500 italic">
                  Note: {order.deliveryDetails.deliveryInstructions}
                </div>
              )}
            </div>
          </div>

          {/* Bill Details & Slot */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center space-x-1.5">
              <ClipboardList size={16} className="text-primary-600" />
              <span>Bill & Slot Details</span>
            </h3>
            
            <div className="text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Delivery Slot:</span>
                <span className="font-bold text-slate-800">{order.deliverySlot}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium text-slate-800">{order.paymentMethod}</span>
              </div>
              {order.utrNumber && (
                <div className="flex justify-between items-center">
                  <span>UTR / Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{order.utrNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Payment Status:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  order.paymentStatus === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : order.paymentStatus === 'Verification Pending'
                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : order.paymentStatus === 'Pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Platform Fee:</span>
                  <span>₹{order.platformFee !== undefined ? order.platformFee : 5}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery Charge:</span>
                  <span>{order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge !== undefined ? order.deliveryCharge : 10}`}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 text-xs pt-1 border-t border-slate-50">
                  <span>Total Amount:</span>
                  <span>₹{order.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery partner info (Rider) */}
          {order.deliveryPartner ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center space-x-1.5">
                <User size={16} className="text-primary-600" />
                <span>Delivery Partner</span>
              </h3>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-800 font-bold flex items-center justify-center">
                  {order.deliveryPartner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{order.deliveryPartner.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">HostelKart Delivery Rider</p>
                  <p className="text-xs text-slate-600 font-semibold flex items-center space-x-1 mt-1">
                    <Phone size={12} />
                    <span>{order.deliveryPartner.phone || 'N/A'}</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            order.orderStatus !== 'Cancelled' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm p-4 text-center space-y-2">
                <div className="text-2xl">⚡</div>
                <h4 className="text-xs font-bold text-slate-800">Assigning Rider</h4>
                <p className="text-[10px] text-slate-400">
                  Our store manager is assigning the nearest delivery partner to pick up your order.
                </p>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderTracking;
