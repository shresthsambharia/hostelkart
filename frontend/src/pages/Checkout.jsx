import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI, couponAPI, walletAPI, authAPI } from '../api';
import { Check, ClipboardList, MapPin, CreditCard, ChevronRight, AlertCircle, Copy, Clock, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

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

  // Online Payment timer details
  const [createdOrder, setCreatedOrder] = useState(null);
  const [timeLeftSec, setTimeLeftSec] = useState(900);
  const [timerExpired, setTimerExpired] = useState(false);

  // Coupon fields
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [allowWalletCombination, setAllowWalletCombination] = useState(true);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Wallet
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

  const deliveryCharge = total < 100 ? 15 : 0;
  const platformFee = 15;
  
  const subtotalWithFees = total + platformFee + deliveryCharge;
  const intermediateTotal = Math.max(0, subtotalWithFees - couponDiscount);
  const maxWalletUsage = intermediateTotal * 0.5;
  const walletDeduction = walletChecked ? Math.min(walletBalance, maxWalletUsage) : 0;
  const finalPayable = Math.max(0, intermediateTotal - walletDeduction);

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

  // Load user details
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

  // Redirect if cart empty
  useEffect(() => {
    if (itemsCount === 0 && !loading && !showUPIScreen) {
      navigate('/cart');
    }
  }, [itemsCount, navigate, loading, showUPIScreen]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.warn('Confetti package trigger failed', e);
    }
  };

  const completeOrderPlacement = async (paymentStatus, utrValue = '') => {
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

      const { data } = await orderAPI.create({
        orderItems,
        deliveryDetails,
        deliverySlot,
        paymentMethod: paymentMethod === 'ONLINE' ? 'UPI' : paymentMethod,
        paymentStatus,
        platformFee,
        deliveryCharge,
        totalAmount: finalPayable,
        couponCode: couponApplied ? couponCode : '',
        walletPaidAmount: walletDeduction,
        utrNumber: utrValue,
      });

      await updateProfile({
        name,
        phone,
        hostelDetails: deliveryDetails
      });

      await clearCart();
      triggerConfetti();
      navigate(`/order-success?id=${data._id}`);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to place order. Try again.');
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!name || !phone || !hostelName || block === '' || floor === '' || !roomNumber) {
      setErrorMsg('Please fill in all address specifications');
      return;
    }

    setLoading(true);

    // Fetch CSRF if needed
    if (!localStorage.getItem('csrfToken')) {
      try {
        const csrfRes = await authAPI.getCsrfToken();
        if (csrfRes.data?.csrfToken) {
          localStorage.setItem('csrfToken', csrfRes.data.csrfToken);
        }
      } catch (e) {
        console.warn('Pre-order CSRF refresh fail', e.message);
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

        try {
          await updateProfile({
            name,
            phone,
            hostelDetails: deliveryDetails
          });
        } catch (pe) {}

        setCreatedOrder(data);
        setShowUPIScreen(true);
        setLoading(false);
      } catch (err) {
        setErrorMsg(err.response?.data?.message || 'Failed to initialize online payment.');
        setLoading(false);
      }
    } else {
      await completeOrderPlacement('Pending');
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText('rawlanineev@okhdfcbank');
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConfirmUPIPayment = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (timerExpired) {
      setErrorMsg('Payment timer expired. Return to products.');
      return;
    }

    const cleanedUtr = utrNumber.trim();
    if (!cleanedUtr || !/^[a-zA-Z0-9]{6,22}$/.test(cleanedUtr)) {
      setErrorMsg('UTR/Transaction ID must be alphanumeric and between 6-22 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data: updatedOrder } = await orderAPI.submitPayment(createdOrder._id, {
        utrNumber: cleanedUtr
      });
      await clearCart();
      triggerConfetti();
      navigate(`/order-success?id=${updatedOrder._id}`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Verification failed. Double check your UTR.');
      setLoading(false);
    }
  };

  // Slots calc
  const now = new Date();
  const timeInMinutes = now.getHours() * 60 + now.getMinutes();
  const isMorningAllowed = timeInMinutes < 480 || timeInMinutes >= 990;
  const isEveningAllowed = timeInMinutes < 990;
  const morningLabel = timeInMinutes >= 990 
    ? '☀ Morning Slot (Tomorrow, 8 AM – 1 PM)' 
    : '☀ Morning Slot (Today, 8 AM – 1 PM)';

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
    { value: 'COD', label: 'Cash on Delivery', desc: 'Pay Cash or UPI on Room Handshake' },
    { value: 'ONLINE', label: 'Direct Online UPI Dispatch', desc: 'Instant verification via dynamic payment QR' }
  ];

  if (showUPIScreen) {
    const upiAmount = createdOrder?.totalAmount ? createdOrder.totalAmount.toFixed(2) : finalPayable;
    const upiLink = `upi://pay?pa=rawlanineev@okhdfcbank&pn=${encodeURIComponent('Neev Rawlani')}&am=${upiAmount}&cu=INR&tr=${createdOrder?._id}&tn=${encodeURIComponent('Order #' + (createdOrder?._id?.substring(12).toUpperCase() || ''))}`;
    const apiURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hostelkart-backend.onrender.com');
    const cleanApiURL = apiURL.replace(/\/$/, '');
    const cleanBaseURL = cleanApiURL.endsWith('/api') ? cleanApiURL : `${cleanApiURL}/api`;
    const qrUrl = createdOrder ? `${cleanBaseURL}/orders/${createdOrder._id}/qr-code` : '';

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto px-4 py-8"
      >
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-premium space-y-6">
          <div className="text-center space-y-2 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Complete Your UPI Payment</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
              Scan the dynamic QR code containing your order details, or use the direct UPI app link below.
            </p>
            <div className="pt-2 select-none">
              {timerExpired ? (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black py-1.5 px-3 rounded-lg inline-block uppercase">
                  🚨 Payment timer expired
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-black py-1.5 px-3 rounded-lg inline-block uppercase animate-pulse">
                  ⏱️ Expires in: <span className="font-mono text-xs">{formatTime(timeLeftSec)}</span>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-4 rounded-2xl flex items-start gap-2 font-bold">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* QR Card */}
            <div className="flex flex-col items-center justify-center space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100/50 select-none">
              {qrUrl && (
                <img 
                  src={qrUrl} 
                  alt="Dynamic UPI QR" 
                  className="w-52 h-52 object-contain rounded-2xl shadow-sm border border-slate-200 bg-white"
                />
              )}
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest text-center leading-none">
                Scan using Google Pay, PhonePe, Paytm
              </span>
            </div>

            {/* Deep link details */}
            <div className="space-y-6">
              <div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-0.5">Payable Amount</span>
                <span className="text-2xl font-black text-slate-900 block">₹{createdOrder?.totalAmount ? createdOrder.totalAmount.toFixed(2) : finalPayable}</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Merchant Details</span>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-655 font-bold">
                  <div><strong>Name:</strong> Neev Rawlani</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong>UPI ID:</strong>
                    <span className="font-mono text-slate-700 select-all truncate">rawlanineev@okhdfcbank</span>
                    <button
                      type="button"
                      onClick={handleCopyUPI}
                      className="px-2 py-1 bg-white border border-slate-205 hover:bg-slate-50 rounded-lg text-[9px] font-black"
                    >
                      {copied ? 'Copied' : 'Copy ID'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={timerExpired ? '#' : upiLink}
                  onClick={(e) => {
                    if (timerExpired) {
                      e.preventDefault();
                      alert('Payment session expired');
                    }
                  }}
                  className={`w-full bg-primary-600 hover:bg-primary-750 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-1 text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all ${timerExpired ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  Open in UPI App
                </a>
              </div>
            </div>
          </div>

          <form onSubmit={handleConfirmUPIPayment} className="border-t border-slate-100 pt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Transaction ID / UTR Reference Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={timerExpired}
                maxLength={22}
                placeholder="Enter 12-digit UPI Ref/UTR ID"
                className="input-field text-xs py-2.5 font-mono font-bold uppercase tracking-wider"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              />
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Enter the reference number from your payment confirmation screen.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUPIScreen(false);
                  setErrorMsg('');
                }}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl"
              >
                Cancel Details
              </button>
              <button
                type="submit"
                disabled={loading || timerExpired}
                className="flex-1 bg-primary-600 hover:bg-primary-750 text-white font-black py-2.5 text-xs uppercase tracking-wider shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Verifying Details...' : 'Submit Verification UTR'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <div className="border-b border-slate-100 pb-3">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-6 bg-primary-600 rounded-full block"></span>
          Room Checkout
        </h1>
        <p className="text-[10px] text-slate-455 font-bold uppercase mt-1">Specify room delivery slot & select payment method</p>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-4 rounded-2xl flex items-start gap-2 font-bold select-none">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form slots */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Hostel location Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
              <MapPin size={16} className="text-primary-600" />
              <h3 className="font-extrabold text-slate-800 text-sm">Hostel Delivery Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Student Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  className="input-field text-xs py-2 font-bold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="hostelName" className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hostel Name</label>
                <input
                  id="hostelName"
                  type="text"
                  placeholder="e.g. Ramanujan Hostel"
                  className="input-field text-xs py-2 font-bold"
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="block" className="text-[10px] font-black text-slate-400 uppercase block mb-1">Block / Wing</label>
                <input
                  id="block"
                  type="text"
                  placeholder="e.g. A-Block"
                  className="input-field text-xs py-2 font-bold"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="floor" className="text-[10px] font-black text-slate-400 uppercase block mb-1">Floor</label>
                <input
                  id="floor"
                  type="text"
                  placeholder="e.g. 3rd Floor"
                  className="input-field text-xs py-2 font-bold"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="roomNumber" className="text-[10px] font-black text-slate-400 uppercase block mb-1">Room Number</label>
                <input
                  id="roomNumber"
                  type="text"
                  placeholder="e.g. 302"
                  className="input-field text-xs py-2 font-bold"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="landmark" className="text-[10px] font-black text-slate-400 uppercase block mb-1">Landmark / Corridor Reference</label>
                <input
                  id="landmark"
                  type="text"
                  placeholder="e.g. Opposite to lift lobby / Near water cooler"
                  className="input-field text-xs py-2 font-bold"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="phone" className="text-[10px] font-black text-slate-400 uppercase block mb-1">Contact Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  className="input-field text-xs py-2 font-bold"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="alternatePhone" className="text-[10px] font-black text-slate-400 uppercase block mb-1">Alternate Phone Number</label>
                <input
                  id="alternatePhone"
                  type="tel"
                  placeholder="Alternate mobile number"
                  className="input-field text-xs py-2 font-bold"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="deliveryInstructions" className="text-[10px] font-black text-slate-400 uppercase block mb-1">Delivery Instructions</label>
                <textarea
                  id="deliveryInstructions"
                  placeholder="e.g. Leave outside room door, call when at block gate"
                  rows={2}
                  className="input-field text-xs py-2"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Delivery Slot scheduler */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
              <ClipboardList size={16} className="text-primary-600" />
              <h3 className="font-extrabold text-slate-800 text-sm">Select Delivery Slot</h3>
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
                        : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="font-extrabold text-xs sm:text-sm leading-snug">{slot.label}</span>
                      {isSelected && slot.enabled && (
                        <div className="w-4.5 h-4.5 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0 ml-2">
                          <Check size={11} />
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] mt-2 block font-medium ${isSelected ? 'text-primary-750' : 'text-slate-400'}`}>
                      {slot.enabled ? slot.subtext : 'Slot not available for this ordering hour'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
              <CreditCard size={16} className="text-primary-600" />
              <h3 className="font-extrabold text-slate-800 text-sm">Payment Options</h3>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${
                    paymentMethod === method.value
                      ? 'border-primary-500 bg-primary-50/60 text-primary-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div>
                    <span className="text-xs sm:text-sm block font-bold">{method.label}</span>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase mt-0.5">{method.desc}</span>
                  </div>
                  {paymentMethod === method.value && (
                    <div className="w-4.5 h-4.5 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                  )}
                </button>
              ))}

              {paymentMethod === 'ONLINE' && (
                <div className="mt-4 p-4 border border-dashed border-primary-200 bg-primary-50/30 rounded-2xl space-y-2 text-xs text-slate-600 select-none animate-slide-down">
                  <p className="font-black text-primary-800 text-xs">📱 Online Payment Instructions</p>
                  <ul className="list-disc list-inside space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm font-semibold">
                    <li>Dynamic payment QR code launches instantly.</li>
                    <li>Supports GPay, PhonePe, Paytm, BHIM deep-links.</li>
                    <li>Submit the UTR number to complete automatic settlement validation.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar Invoice Review */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium h-fit space-y-6">
          <h2 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">
            Review Order
          </h2>

          <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
            {cart.items.map((item) => {
              if (!item.product) return null;
              const product = item.product;
              const discountedPrice = Math.round(
                product.price - (product.price * (product.discount || 0)) / 100
              );

              return (
                <div key={item._id} className="flex justify-between items-center text-xs gap-2">
                  <div className="truncate">
                    <span className="font-black text-slate-800">{item.quantity}x</span>{' '}
                    <span className="text-slate-655 font-semibold truncate">{product.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-800 shrink-0">₹{discountedPrice * item.quantity}</span>
                </div>
              );
            })}
          </div>

          {/* Coupon Codes */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Apply Coupon</h3>
            {couponApplied ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2.5 rounded-2xl select-none">
                <div className="text-xs">
                  <span className="font-black text-emerald-800 tracking-wide bg-emerald-100/50 border border-emerald-250 px-2 py-0.5 rounded-lg uppercase">{couponCode}</span>
                  <p className="text-[10px] text-emerald-600 mt-1 font-bold">Coupon applied! Saved ₹{couponDiscount}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs font-black text-red-500 hover:underline"
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
                    className="flex-1 rounded-xl border border-slate-200 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-bold uppercase tracking-wider text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="bg-primary-600 hover:bg-primary-750 disabled:opacity-50 text-white font-black py-1.5 px-4 rounded-xl text-xs shadow-sm shrink-0"
                  >
                    {validatingCoupon ? 'Wait...' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[9px] font-black text-red-500">⚠️ {couponError}</p>
                )}
              </div>
            )}
          </div>

          {/* Wallet combination */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pay using Wallet</h3>
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-bold text-slate-700">Wallet Balance: ₹{walletBalance.toFixed(2)}</div>
                {walletBalance > 0 ? (
                  <div className="text-[9px] text-slate-455 font-bold uppercase">
                    {!allowWalletCombination && couponApplied ? (
                      <span className="text-amber-600">Cannot combine with coupon</span>
                    ) : (
                      <span>Use up to 50% of payable total</span>
                    )}
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-400 font-bold uppercase">No balance available</div>
                )}
              </div>
              <input
                type="checkbox"
                disabled={walletBalance <= 0 || (!allowWalletCombination && couponApplied)}
                checked={walletChecked}
                onChange={(e) => setWalletChecked(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 h-4.5 w-4.5 border-slate-350 disabled:opacity-40 cursor-pointer"
              />
            </div>
          </div>

          {/* Bill breakdown calculations */}
          <div className="border-t border-slate-100 pt-4 space-y-3.5 text-xs">
            <div className="flex justify-between text-slate-500 font-bold">
              <span>Items Total</span>
              <span>₹{total}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-bold">
              <span>Platform Fee</span>
              <span>₹{platformFee}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-bold">
              <span>Delivery Fee</span>
              {deliveryCharge === 0 ? (
                <div className="flex items-center gap-1 select-none">
                  <span className="line-through text-slate-400">₹15</span>
                  <span className="text-emerald-600 font-black">FREE</span>
                </div>
              ) : (
                <span>₹{deliveryCharge}</span>
              )}
            </div>
            {couponApplied && (
              <div className="flex justify-between text-emerald-655 font-black">
                <span>Coupon Saved</span>
                <span>-₹{couponDiscount}</span>
              </div>
            )}
            {walletChecked && walletDeduction > 0 && (
              <div className="flex justify-between text-primary-600 font-black">
                <span>Paid via Wallet</span>
                <span>-₹{walletDeduction.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3.5 flex justify-between text-slate-900 font-black text-sm">
              <span>Grand Payable</span>
              <span className="text-emerald-600">₹{finalPayable.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-750 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-1 text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            <span>{loading ? 'Processing...' : 'Place Room Order'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default Checkout;
