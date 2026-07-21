import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI, couponAPI, walletAPI, authAPI } from '../api';
import { Check, ClipboardList, MapPin, CreditCard, ChevronRight, AlertCircle, Copy, Upload, Image } from 'lucide-react';

const Checkout = () => {
  const { cart, total, itemsCount, clearCart } = useCart();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const getDefaultSlot = () => {
    const d = new Date();
    const min = d.getHours() * 60 + d.getMinutes();
    if (min < 480) return 'Morning Slot (8:00 AM – 1:00 PM)';
    if (min < 990) return 'Evening Slot (1:30 PM – 4:30 PM)';
    return 'Morning Slot (Next Day, 8:00 AM – 1:00 PM)';
  };

  const [deliverySlot, setDeliverySlot] = useState(getDefaultSlot());
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [utrNumber, setUtrNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showUPIScreen, setShowUPIScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // New payment states
  const [createdOrder, setCreatedOrder] = useState(null);
  const [timeLeftSec, setTimeLeftSec] = useState(900);
  const [timerExpired, setTimerExpired] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [allowWalletCombination, setAllowWalletCombination] = useState(true);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Wallet states
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletChecked, setWalletChecked] = useState(false);

  // Load wallet balance on mount
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const { data } = await walletAPI.getDetails();
        setWalletBalance(data.walletBalance || 0);
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
      }
    };
    fetchWallet();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const { data } = await couponAPI.validate(couponCode, total);
      setCouponDiscount(data.discountAmount);
      setAllowWalletCombination(data.allowWalletCombination);
      setCouponApplied(true);
      
      // Enforce combination cap rule
      if (!data.allowWalletCombination) {
        setWalletChecked(false);
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
      setCouponApplied(false);
      setCouponDiscount(0);
      setAllowWalletCombination(true);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setCouponDiscount(0);
    setAllowWalletCombination(true);
    setCouponError('');
  };
  const [simulatedOrderData, setSimulatedOrderData] = useState(null);
  const [simulatedTab, setSimulatedTab] = useState('card');
  const [simulatedCard, setSimulatedCard] = useState('');
  const [simulatedExpiry, setSimulatedExpiry] = useState('');
  const [simulatedCvv, setSimulatedCvv] = useState('');
  const [simulatedUpi, setSimulatedUpi] = useState('');
  const [simulatedLoading, setSimulatedLoading] = useState(false);
  const [simulatedError, setSimulatedError] = useState('');

  const deliveryCharge = total < 100 ? 15 : 0;
  const platformFee = 15;
  
  const subtotalWithFees = total + platformFee + deliveryCharge;
  const intermediateTotal = Math.max(0, subtotalWithFees - couponDiscount);
  const maxWalletUsage = intermediateTotal * 0.5;
  const walletDeduction = walletChecked ? Math.min(walletBalance, maxWalletUsage) : 0;
  const finalPayable = Math.max(0, intermediateTotal - walletDeduction);
  const finalTotal = subtotalWithFees;


  useEffect(() => {
    if (!showUPIScreen || !createdOrder?.paymentExpiresAt) return;
    
    const calculateTimeLeft = () => {
      const difference = new Date(createdOrder.paymentExpiresAt) - new Date();
      if (difference <= 0) {
        setTimeLeftSec(0);
        setTimerExpired(true);
        return;
      }
      setTimeLeftSec(Math.floor(difference / 1000));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [showUPIScreen, createdOrder]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load user hostel details on mount
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      if (user.hostelDetails) {
        setHostelName(user.hostelDetails.hostelName || '');
        setBlock(user.hostelDetails.block || '');
        setFloor(user.hostelDetails.floor || '');
        setRoomNumber(user.hostelDetails.roomNumber || '');
        setAlternatePhone(user.hostelDetails.alternatePhone || '');
        setLandmark(user.hostelDetails.landmark || '');
        setDeliveryInstructions(user.hostelDetails.deliveryInstructions || '');
      }
    }
  }, [user]);

  // If no items, redirect back to cart
  useEffect(() => {
    if (itemsCount === 0 && !loading && !showUPIScreen) {
      navigate('/cart');
    }
  }, [itemsCount, navigate, loading, showUPIScreen]);

  const completeOrderPlacement = async (paymentStatus, utrNumber = '', cfOrderId = '', transactionId = '', failureReason = '') => {
    console.log('[DEBUG-PAYMENT] Frontend completeOrderPlacement INITIATED:', { paymentStatus, cfOrderId, transactionId, failureReason });
    try {
      const orderItems = cart.items.map(item => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        discount: item.product.discount || 0
      }));

      const deliveryDetails = {
        hostelName,
        block,
        floor,
        roomNumber,
        phone,
        alternatePhone,
        landmark,
        deliveryInstructions
      };

      // 1. Create order
      const { data } = await orderAPI.create({
        orderItems,
        deliveryDetails,
        deliverySlot,
        paymentMethod,
        paymentStatus,
        platformFee,
        deliveryCharge,
        totalAmount: finalPayable,
        couponCode: couponApplied ? couponCode : '',
        walletPaidAmount: walletDeduction,
        utrNumber,
        cf_order_id: cfOrderId,
        transaction_id: transactionId,
        paymentFailureReason: failureReason
      });

      console.log('[DEBUG-PAYMENT] Frontend completeOrderPlacement SUCCESS. Response data:', data);

      // 2. Save hostel details in profile for future ease-of-use
      await updateProfile({
        name,
        phone,
        hostelDetails: {
          hostelName,
          block,
          floor,
          roomNumber,
          alternatePhone,
          landmark,
          deliveryInstructions
        }
      });

      if (paymentStatus === 'Paid' || paymentStatus === 'PAID') {
        // Clear cart client-side
        await clearCart();
        // Navigate to success page
        navigate(`/order-success?id=${data._id}`);
      } else if (paymentStatus === 'FAILED') {
        // Just set the error message and do NOT clear cart or navigate
        setErrorMsg(failureReason || 'Payment failed. Please try again.');
        setLoading(false);
      } else {
        // For COD or other pending methods
        await clearCart();
        navigate(`/order-success?id=${data._id}`);
      }
    } catch (error) {
      console.error('[DEBUG-PAYMENT] Frontend completeOrderPlacement ERROR:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to place order. Try again.');
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!name || !phone || !hostelName || block === '' || floor === '' || !roomNumber) {
      setErrorMsg('Please fill in all address and contact details');
      return;
    }

    setLoading(true);

    // Ensure CSRF token is present before state-changing order placement
    if (!localStorage.getItem('csrfToken')) {
      try {
        const csrfRes = await authAPI.getCsrfToken();
        if (csrfRes.data?.csrfToken) {
          localStorage.setItem('csrfToken', csrfRes.data.csrfToken);
        }
      } catch (e) {
        console.warn('Pre-order CSRF token refresh warning:', e.message);
      }
    }

    if (paymentMethod === 'ONLINE') {
      try {
        const orderItems = cart.items.map(item => ({
          product: item.product._id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          discount: item.product.discount || 0
        }));

        const deliveryDetails = {
          hostelName,
          block,
          floor,
          roomNumber,
          phone,
          alternatePhone,
          landmark,
          deliveryInstructions
        };

        // Immediately place order in Pending Payment state
        console.log('[DEBUG-PAYMENT] Creating Pending Payment UPI order...');
        const { data } = await orderAPI.create({
          orderItems,
          deliveryDetails,
          deliverySlot,
          paymentMethod: 'UPI',
          paymentStatus: 'Pending Payment',
          platformFee,
          deliveryCharge,
          totalAmount: finalPayable,
          couponCode: couponApplied ? couponCode : '',
          walletPaidAmount: walletDeduction
        });

        console.log('[DEBUG-PAYMENT] UPI order created:', data);

        // Save hostel details in profile
        try {
          await updateProfile({
            name,
            phone,
            hostelDetails: deliveryDetails
          });
        } catch (profileErr) {
          console.warn('Failed to update profile hostel details', profileErr);
        }

        setCreatedOrder(data);
        setShowUPIScreen(true);
        setLoading(false);
      } catch (err) {
        console.error('[DEBUG-PAYMENT] Failed to create pending order:', err);
        setErrorMsg(err.response?.data?.message || 'Failed to place order. Try again.');
        setLoading(false);
      }
    } else {
      // Cash on Delivery
      await completeOrderPlacement('Pending');
    }
  };

  // Dynamic Delivery Slot Calculation based on order placement time
  const now = new Date();
  const timeInMinutes = now.getHours() * 60 + now.getMinutes();

  const isMorningAllowed = timeInMinutes < 480 || timeInMinutes >= 990;
  const isEveningAllowed = timeInMinutes < 990;

  const morningLabel = timeInMinutes >= 990 
    ? '☀ Morning Slot (Next Day, 8:00 AM – 1:00 PM)' 
    : '☀ Morning Slot (8:00 AM – 1:00 PM)';

  const slots = [
    {
      id: 'morning',
      label: morningLabel,
      value: timeInMinutes >= 990 ? 'Morning Slot (Next Day, 8:00 AM – 1:00 PM)' : 'Morning Slot (8:00 AM – 1:00 PM)',
      enabled: isMorningAllowed,
      subtext: timeInMinutes >= 990 ? 'Scheduled for tomorrow morning' : 'Delivered by 1:00 PM'
    },
    {
      id: 'evening',
      label: '🌇 Evening Slot (1:30 PM – 4:30 PM)',
      value: 'Evening Slot (1:30 PM – 4:30 PM)',
      enabled: isEveningAllowed,
      subtext: 'Delivered by 4:30 PM'
    }
  ];

  const paymentMethods = [
    { value: 'COD', label: 'Cash on Delivery', desc: 'Pay at your door' },
    { value: 'ONLINE', label: 'Pay Online (UPI / QR Code)', desc: 'Scan code or pay using any UPI App (GPay, PhonePe, Paytm)' }
  ];

  const handleCopyUPI = () => {
    navigator.clipboard.writeText('rawlanineev@okhdfcbank');
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConfirmUPIPayment = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (timerExpired) {
      setErrorMsg('This payment session has expired. Please return to products to place a new order.');
      return;
    }

    if (!utrNumber.trim()) {
      setErrorMsg('Please enter the UTR/Transaction Number to verify payment');
      return;
    }
    const cleanedUtr = utrNumber.trim();
    const utrRegex = /^[a-zA-Z0-9]{6,22}$/;
    if (!utrRegex.test(cleanedUtr)) {
      setErrorMsg('UTR/Transaction ID must be alphanumeric and between 6 and 22 characters.');
      return;
    }

    setLoading(true);

    try {
      // Submit payment info
      console.log('[DEBUG-PAYMENT] Submitting payment details for order:', createdOrder._id);
      const { data: updatedOrder } = await orderAPI.submitPayment(createdOrder._id, {
        utrNumber: cleanedUtr
      });

      console.log('[DEBUG-PAYMENT] Payment submission success:', updatedOrder);
      await clearCart();
      navigate(`/order-success?id=${updatedOrder._id}`);
    } catch (err) {
      console.error('[DEBUG-PAYMENT] Failed to submit payment details:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit payment. Please verify your UTR and screenshot.');
      setLoading(false);
    }
  };

  if (showUPIScreen) {
    const upiAmount = createdOrder?.totalAmount ? createdOrder.totalAmount.toFixed(2) : finalPayable;
    const upiLink = `upi://pay?pa=rawlanineev@okhdfcbank&pn=${encodeURIComponent('Neev Rawlani')}&am=${upiAmount}&cu=INR&tr=${createdOrder?._id}&tn=${encodeURIComponent('Order #' + (createdOrder?._id?.substring(12).toUpperCase() || ''))}`;
    const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hostelkart-backend.onrender.com');
    const cleanApiURL = apiURL.replace(/\/$/, '');
    const cleanBaseURL = cleanApiURL.endsWith('/api') ? cleanApiURL : `${cleanApiURL}/api`;
    const qrUrl = createdOrder ? `${cleanBaseURL}/orders/${createdOrder._id}/qr-code` : '';

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-premium space-y-6">
          <div className="text-center space-y-2 pb-4 border-b border-slate-100">
            <h2 className="text-2xl font-display font-black text-slate-800">Complete Your UPI Payment</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Scan the dynamic QR code containing your exact order details, or use the direct UPI app link. Submit the UTR to complete verification.
            </p>
            {/* Live countdown timer */}
            <div className="pt-2">
              {timerExpired ? (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-bold py-2 px-4 rounded-xl inline-block">
                  🚨 Payment Time Expired. Stock has been released.
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs font-bold py-2 px-4 rounded-xl inline-block animate-pulse">
                  ⏱️ Payment session expires in: <span className="font-mono text-sm">{formatTime(timeLeftSec)}</span>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-4 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left Column: QR Code */}
            <div className="flex flex-col items-center justify-center space-y-3 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100/50">
              {qrUrl && (
                <img 
                  src={qrUrl} 
                  alt="Dynamic UPI Payment QR Code" 
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl shadow-sm border border-slate-200 bg-white"
                />
              )}
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Scan using Google Pay, PhonePe, Paytm, BHIM
              </span>
            </div>

            {/* Right Column: Details & Deep links */}
            <div className="space-y-6">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Payable Amount</span>
                <span className="text-3xl font-black text-slate-800 block">₹{createdOrder?.totalAmount ? createdOrder.totalAmount.toFixed(2) : finalPayable}</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Merchant Details</span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div>
                    <strong>Name:</strong> Neev Rawlani
                  </div>
                  <div className="flex items-center space-x-2">
                    <strong className="shrink-0">UPI ID:</strong>
                    <span className="font-mono font-bold text-slate-700 select-all truncate">
                      rawlanineev@okhdfcbank
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUPI}
                      className="btn-secondary py-1 px-2 text-[10px] shrink-0 font-bold flex items-center gap-1"
                    >
                      <Copy size={10} />
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                {copied && (
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                    ✓ UPI ID Copied Successfully
                  </p>
                )}
              </div>

              {/* UPI Intent Deep Link Button */}
              <div className="space-y-2 pt-2">
                <a
                  href={timerExpired ? '#' : upiLink}
                  onClick={(e) => {
                    if (timerExpired) {
                      e.preventDefault();
                      alert('Payment session has expired.');
                    }
                  }}
                  className={`w-full btn-primary py-3 flex items-center justify-center space-x-2 text-sm font-black shadow-md hover:shadow-lg transition-all text-white ${timerExpired ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <span>Open in UPI App</span>
                </a>
                <p className="text-[10px] text-slate-400 text-center leading-normal">
                  Click to open payment directly in your installed UPI app (GPay / PhonePe / Paytm).
                </p>
              </div>
            </div>
          </div>

          {/* Form: UTR Submission */}
          <form onSubmit={handleConfirmUPIPayment} className="border-t border-slate-100 pt-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Transaction ID / UTR Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={timerExpired}
                maxLength={22}
                placeholder="Enter 6-22 digit UTR Number"
                className="input-field text-sm font-mono font-bold placeholder:font-sans placeholder:font-normal disabled:bg-slate-50 disabled:cursor-not-allowed max-w-md"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                Reference number from your bank app payment receipt screen.
              </p>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUPIScreen(false);
                  setErrorMsg('');
                }}
                className="btn-secondary py-3 px-6 text-sm font-bold"
              >
                Back to Details
              </button>
              <button
                type="submit"
                disabled={loading || timerExpired}
                className="flex-1 btn-primary py-3 text-sm font-black shadow-md hover:shadow-lg disabled:opacity-50 text-white"
              >
                {loading ? 'Submitting Details...' : 'Submit Payment Verification Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8">Checkout</h1>

      {errorMsg && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-700 text-sm p-4 rounded-xl flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form sections */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Hostel details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-primary-50 rounded-lg text-primary-600">
                <MapPin size={18} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base">Hostel Delivery Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Student Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  className="input-field text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="hostelName" className="text-xs font-semibold text-slate-600 block mb-1">Hostel Name</label>
                <input
                  id="hostelName"
                  type="text"
                  placeholder="e.g. Ramanujan Hostel"
                  className="input-field text-sm"
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="block" className="text-xs font-semibold text-slate-600 block mb-1">Block / Wing</label>
                <input
                  id="block"
                  type="text"
                  placeholder="e.g. A-Block"
                  className="input-field text-sm"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="floor" className="text-xs font-semibold text-slate-600 block mb-1">Floor</label>
                <input
                  id="floor"
                  type="text"
                  placeholder="e.g. 3rd Floor"
                  className="input-field text-sm"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="roomNumber" className="text-xs font-semibold text-slate-600 block mb-1">Room Number</label>
                <input
                  id="roomNumber"
                  type="text"
                  placeholder="e.g. 302"
                  className="input-field text-sm"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="landmark" className="text-xs font-semibold text-slate-600 block mb-1">Landmark (Optional)</label>
                <input
                  id="landmark"
                  type="text"
                  placeholder="e.g. Opposite to lift lobby / Near water cooler"
                  className="input-field text-sm"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="phone" className="text-xs font-semibold text-slate-600 block mb-1">Contact Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="10 digit mobile number"
                  className="input-field text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="alternatePhone" className="text-xs font-semibold text-slate-600 block mb-1">Alternate Phone Number (Optional)</label>
                <input
                  id="alternatePhone"
                  type="tel"
                  placeholder="Alternate mobile number"
                  className="input-field text-sm"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="deliveryInstructions" className="text-xs font-semibold text-slate-600 block mb-1">Delivery Instructions (Optional)</label>
                <textarea
                  id="deliveryInstructions"
                  placeholder="e.g. Leave outside room door, call when at block gate"
                  rows={2}
                  className="input-field text-sm"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Delivery Slot */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-primary-50 rounded-lg text-primary-600">
                <ClipboardList size={18} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base">Select Delivery Slot</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {slots.map((slot) => {
                const isSelected = deliverySlot === slot.value;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!slot.enabled}
                    onClick={() => setDeliverySlot(slot.value)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                      !slot.enabled
                        ? 'border-slate-100 bg-slate-50/50 opacity-40 cursor-not-allowed text-slate-400'
                        : isSelected
                        ? 'border-primary-500 bg-primary-50/60 text-primary-900 shadow-sm ring-1 ring-primary-500/25 font-bold'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="font-extrabold text-sm sm:text-base leading-snug">{slot.label}</span>
                      {isSelected && slot.enabled && (
                        <div className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0 ml-2">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                    <span className={`text-[11px] mt-2 block font-medium ${isSelected ? 'text-primary-750' : 'text-slate-400'}`}>
                      {slot.enabled ? slot.subtext : 'Slot not available for this ordering time'}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Slot note alert */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-slate-500 text-[11px] leading-relaxed flex items-start gap-2">
              <span className="shrink-0 text-slate-400">🕒</span>
              <span>
                <strong>Scheduling Rules:</strong> Morning slot is open for orders placed before 8 AM (or after 4:30 PM for next day). Evening slot is open for orders placed before 4:30 PM.
              </span>
            </div>
          </div>

          {/* 3. Payment Method */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-primary-50 rounded-lg text-primary-600">
                <CreditCard size={18} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base">Payment Options</h3>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                    paymentMethod === method.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                  }`}
                >
                  <div>
                    <span className="text-sm block">{method.label}</span>
                    <span className="text-xs text-slate-400 font-normal">{method.desc}</span>
                  </div>
                  {paymentMethod === method.value && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              ))}

              {paymentMethod === 'ONLINE' && (
                <div className="mt-4 p-4 border border-dashed border-primary-200 bg-primary-50/30 rounded-xl space-y-3 text-xs text-slate-600 animate-fadeIn">
                  <p className="font-bold text-primary-800 text-sm">📱 Online Payment Instructions</p>
                  <ul className="list-disc list-inside space-y-1 bg-white p-3 rounded-lg border border-slate-100 shadow-sm leading-relaxed">
                    <li>UPI app redirection works best on mobile devices.</li>
                    <li>On laptop/desktop, you can choose to enter a UPI ID or scan the dynamically generated QR code inside the Cashfree Checkout popup.</li>
                    <li>Click <strong>Place Room Order</strong> below to open the secure payment screen.</li>
                  </ul>
                  <div className="bg-slate-50 p-2.5 rounded-lg text-slate-500 font-semibold italic border border-slate-100/50">
                    ℹ️ UPI apps open on mobile. On laptop, scan QR or enter UPI ID.
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * UPI app redirection works best on mobile. On laptop, use UPI ID or scan QR.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Order review sidebar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-6">
          <h2 className="font-extrabold text-slate-800 text-lg border-b border-slate-100 pb-3">
            Review Order
          </h2>

          {/* Items review */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {cart.items.map((item) => {
              if (!item.product) return null;
              const product = item.product;
              const discountedPrice = Math.round(
                product.price - (product.price * (product.discount || 0)) / 100
              );

              return (
                <div key={item._id} className="flex justify-between items-center text-sm gap-2">
                  <div className="truncate">
                    <span className="font-bold text-slate-800">{item.quantity}x</span>{' '}
                    <span className="text-slate-600 font-medium truncate">{product.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 shrink-0">₹{discountedPrice * item.quantity}</span>
                </div>
              );
            })}
          </div>

          {/* Coupon Code Input */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Apply Coupon</h3>
            {couponApplied ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                <div className="text-xs">
                  <span className="font-extrabold text-emerald-800 tracking-wide bg-emerald-100/50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">{couponCode}</span>
                  <p className="text-[10px] text-emerald-600 mt-1 font-medium">Applied! Saved ₹{couponDiscount}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs font-extrabold text-red-500 hover:text-red-700 shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ENTER COUPON CODE"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError('');
                    }}
                    className="flex-1 rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 font-bold uppercase tracking-wider text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md shadow-primary-600/10 transition-all shrink-0"
                  >
                    {validatingCoupon ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[10px] font-semibold text-red-500">⚠️ {couponError}</p>
                )}
              </div>
            )}
          </div>

          {/* Wallet Balance Apply */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pay using Wallet</h3>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-bold text-slate-700">Wallet Balance: ₹{walletBalance.toFixed(2)}</div>
                {walletBalance > 0 ? (
                  <div className="text-[10px] text-slate-400">
                    {!allowWalletCombination && couponApplied ? (
                      <span className="text-amber-600 font-semibold">Cannot combine this coupon with wallet</span>
                    ) : (
                      <span>Use up to 50% of order value (Max: ₹{((total + platformFee + deliveryCharge - couponDiscount) * 0.5).toFixed(2)})</span>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400">No balance available in wallet</div>
                )}
              </div>
              <input
                type="checkbox"
                disabled={walletBalance <= 0 || (!allowWalletCombination && couponApplied)}
                checked={walletChecked}
                onChange={(e) => setWalletChecked(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 h-4.5 w-4.5 border-slate-300 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Pricing list */}
          {(() => {
            const subtotalWithFees = total + platformFee + deliveryCharge;
            const intermediateTotal = Math.max(0, subtotalWithFees - couponDiscount);
            const maxWalletUsage = intermediateTotal * 0.5;
            const walletDeduction = walletChecked ? Math.min(walletBalance, maxWalletUsage) : 0;
            const finalPayable = Math.max(0, intermediateTotal - walletDeduction);

            return (
              <div className="border-t border-slate-100 pt-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Items Subtotal</span>
                  <span>₹{total}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Delivery Fee</span>
                  {deliveryCharge === 0 ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="line-through text-slate-400">₹15</span>
                      <span className="text-emerald-600 font-bold">FREE</span>
                    </div>
                  ) : (
                    <span>₹{deliveryCharge}</span>
                  )}
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                )}
                {walletChecked && walletDeduction > 0 && (
                  <div className="flex justify-between text-primary-600 font-semibold">
                    <span>Paid via Wallet</span>
                    <span>-₹{walletDeduction.toFixed(2)}</span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg leading-relaxed">
                    Add <strong>₹{100 - total}</strong> more to your cart to get <strong>FREE delivery</strong>!
                  </div>
                )}
                <div className="border-t border-slate-100 pt-3 flex justify-between text-slate-800 font-extrabold text-base">
                  <span>Payable Amount</span>
                  <span>₹{finalPayable.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}

          {(() => {
            const subtotalWithFees = total + platformFee + deliveryCharge;
            const intermediateTotal = Math.max(0, subtotalWithFees - couponDiscount);
            const maxWalletUsage = intermediateTotal * 0.5;
            const walletDeduction = walletChecked ? Math.min(walletBalance, maxWalletUsage) : 0;
            const finalPayable = Math.max(0, intermediateTotal - walletDeduction);

            // Export variable helpers to the surrounding functional component scope
            window.finalPayable = finalPayable;
            window.walletDeduction = walletDeduction;

            return (
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 flex items-center justify-center space-x-2 text-sm shadow-md hover:shadow-lg"
              >
                <span>{loading ? 'Processing...' : 'Place Room Order'}</span>
                <ChevronRight size={16} />
              </button>
            );
          })()}
        </div>
      </form>
    </div>
  );
};

export default Checkout;
