import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI, paymentAPI } from '../api';
import { Check, ClipboardList, MapPin, CreditCard, ChevronRight, AlertCircle } from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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

  const [deliverySlot, setDeliverySlot] = useState('Immediate');
  const [customSlot, setCustomSlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [utrNumber, setUtrNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
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
  const finalTotal = total + platformFee + deliveryCharge;


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
    if (itemsCount === 0 && !loading) {
      navigate('/cart');
    }
  }, [itemsCount, navigate, loading]);

  const completeOrderPlacement = async (paymentStatus, utrNumber = '', razorpayOrderId = '', razorpayPaymentId = '', razorpaySignature = '', failureReason = '') => {
    console.log('[DEBUG-PAYMENT] Frontend completeOrderPlacement INITIATED:', { paymentStatus, razorpayOrderId, razorpayPaymentId, failureReason });
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

      const finalDeliverySlot = deliverySlot === 'Custom Time Slot' ? customSlot : deliverySlot;

      // 1. Create order
      const { data } = await orderAPI.create({
        orderItems,
        deliveryDetails,
        deliverySlot: finalDeliverySlot,
        paymentMethod,
        paymentStatus,
        platformFee,
        deliveryCharge,
        totalAmount: finalTotal,
        utrNumber,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
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

  const handleSimulatedPayment = async () => {
    setSimulatedError('');
    setSimulatedLoading(true);

    // Validate inputs
    if (simulatedTab === 'card') {
      const cleanCard = simulatedCard.replace(/\s+/g, '');
      if (cleanCard !== '4111111111111111' || simulatedCvv !== '123' || simulatedExpiry !== '12/26') {
        setSimulatedError('Invalid card details. Use Card: 4111111111111111, CVV: 123, Expiry: 12/26');
        setSimulatedLoading(false);
        return;
      }
    } else if (simulatedTab === 'upi') {
      if (simulatedUpi.trim() !== 'test@razorpay') {
        setSimulatedError('Invalid UPI ID. Use UPI ID: test@razorpay');
        setSimulatedLoading(false);
        return;
      }
    }

    // Process successful payment simulation
    console.log('[DEBUG-PAYMENT] Simulated Payment SUCCESS:', { tab: simulatedTab });
    const order_id = simulatedOrderData.order_id || simulatedOrderData.id;
    const payment_id = 'pay_sim_' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const signature = 'mock_signature_passed';

    try {
      console.log('[DEBUG-PAYMENT] Simulated calling verifyPayment API...');
      await paymentAPI.verifyPayment({
        razorpay_order_id: order_id,
        razorpay_payment_id: payment_id,
        razorpay_signature: signature,
      });

      console.log('[DEBUG-PAYMENT] Simulated verifyPayment SUCCESS, completing order placement...');
      
      // Close modal first
      setShowSimulatedModal(false);
      setSimulatedLoading(false);

      await completeOrderPlacement(
        'Paid',
        '', // no UTR for Razorpay
        order_id,
        payment_id,
        signature
      );
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Payment verification failed';
      console.error('[DEBUG-PAYMENT] Simulated verification failed:', err);
      setSimulatedError(errMsg);
      setSimulatedLoading(false);
    }
  };

  const handleCancelSimulatedPayment = async () => {
    console.log('[DEBUG-PAYMENT] Simulated Payment CANCELLED');
    const order_id = simulatedOrderData.order_id || simulatedOrderData.id;
    setShowSimulatedModal(false);
    
    await completeOrderPlacement(
      'FAILED',
      '',
      order_id,
      '',
      '',
      'Payment cancelled by user (Simulation)'
    );
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!name || !phone || !hostelName || !block || !floor || !roomNumber) {
      setErrorMsg('Please fill in all address and contact details');
      return;
    }

    if (deliverySlot === 'Custom Time Slot' && !customSlot.trim()) {
      setErrorMsg('Please enter your custom time slot details');
      return;
    }

    if (paymentMethod === 'ONLINE') {
      setLoading(true);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMsg('Razorpay SDK failed to load. Are you offline?');
        setLoading(false);
        return;
      }

      try {
        console.log('[DEBUG-PAYMENT] Frontend initiating createOrder with amount (paise):', Math.round(finalTotal * 100));
        const { data: rzpOrder } = await paymentAPI.createOrder(Math.round(finalTotal * 100));
        console.log('[DEBUG-PAYMENT] Frontend createOrder response:', rzpOrder);

        if (rzpOrder.isMock) {
          console.log('[DEBUG-PAYMENT] Mock order detected, opening simulated payment modal...');
          setSimulatedOrderData(rzpOrder);
          setShowSimulatedModal(true);
          return;
        }

        const options = {
          key: rzpOrder.key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T0oyPuoxShGQTU',
          amount: rzpOrder.amount,
          currency: rzpOrder.currency || 'INR',
          name: 'HostelKart',
          description: 'Hostel Room Order Payment',
          order_id: rzpOrder.order_id || rzpOrder.id,
          handler: async function (response) {
            console.log('[DEBUG-PAYMENT] Frontend Razorpay handler SUCCESS event:', response);
            setLoading(true);
            try {
              // Verify payment on backend
              console.log('[DEBUG-PAYMENT] Frontend calling verifyPayment API with response...');
              const verifyRes = await paymentAPI.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              console.log('[DEBUG-PAYMENT] Frontend verifyPayment API response:', verifyRes.data);

              // Submit order as Paid
              await completeOrderPlacement(
                'Paid',
                '', // no UTR for Razorpay
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
            } catch (err) {
              const errMsg = err.response?.data?.message || 'Payment verification failed';
              console.error('[DEBUG-PAYMENT] Frontend payment verification ERROR:', err);
              setErrorMsg(errMsg);
              setLoading(false);

              // Submit failed order in background
              await completeOrderPlacement(
                'FAILED',
                '',
                response.razorpay_order_id || rzpOrder.order_id || rzpOrder.id,
                response.razorpay_payment_id || '',
                response.razorpay_signature || '',
                errMsg
              );
            }
          },
          prefill: {
            name: name,
            contact: phone,
            email: user?.email || '',
          },
          notes: {
            address: `${hostelName}, Block ${block}, Room ${roomNumber}`,
          },
          modal: {
            ondismiss: async function () {
              const errMsg = 'Payment cancelled by user';
              console.log('[DEBUG-PAYMENT] Frontend Razorpay modal DISMISSED');
              setErrorMsg(errMsg);
              setLoading(false);

              // Submit failed order in background
              await completeOrderPlacement(
                'FAILED',
                '',
                rzpOrder.order_id || rzpOrder.id,
                '',
                '',
                errMsg
              );
            }
          },
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true
          },
          theme: {
            color: '#4f46e5',
          },
        };

        localStorage.setItem('last_razorpay_options', JSON.stringify(options));
        console.log('[DEBUG-PAYMENT] options:', options);
        console.log('[DEBUG-PAYMENT] key:', options.key);
        console.log('[DEBUG-PAYMENT] order_id:', options.order_id);
        console.log('[DEBUG-PAYMENT] amount:', options.amount);
        console.log('[DEBUG-PAYMENT] currency:', options.currency);
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async function (response) {
          const errMsg = response.error.description || 'Payment failed';
          console.error('[DEBUG-PAYMENT] Frontend Razorpay payment.failed EVENT:', response);
          console.error('[DEBUG-PAYMENT] Failed Code:', response.error.code);
          console.error('[DEBUG-PAYMENT] Failed Description:', response.error.description);
          console.error('[DEBUG-PAYMENT] Failed Source:', response.error.source);
          console.error('[DEBUG-PAYMENT] Failed Step:', response.error.step);
          console.error('[DEBUG-PAYMENT] Failed Reason:', response.error.reason);
          console.error('[DEBUG-PAYMENT] Failed Metadata:', response.error.metadata);
          setErrorMsg(errMsg);
          setLoading(false);

          // Submit failed order in background
          await completeOrderPlacement(
            'FAILED',
            '',
            response.error.metadata.order_id || rzpOrder.order_id || rzpOrder.id,
            response.error.metadata.payment_id || '',
            '',
            errMsg
          );
        });
        rzp.open();
      } catch (error) {
        console.error('[DEBUG-PAYMENT] Frontend createOrder or modal open ERROR:', error);
        setErrorMsg(error.response?.data?.message || 'Failed to initialize payment gateway. Try again.');
        setLoading(false);
      }
    } else {
      // Cash on Delivery
      setLoading(true);
      await completeOrderPlacement('Pending');
    }
  };

  const deliverySlots = [
    { label: 'Deliver Now (⚡ under 30 mins)', value: 'Immediate' },
    { label: 'Evening slot (6 PM - 9 PM)', value: 'Evening slot' },
    { label: 'Custom Time Slot', value: 'Custom Time Slot' }
  ];

  const paymentMethods = [
    { value: 'COD', label: 'Cash on Delivery', desc: 'Pay at your door' },
    { value: 'ONLINE', label: 'Online Payment - UPI / QR / Card', desc: 'Pay securely using UPI app, QR code, Cards, or NetBanking' }
  ];

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {deliverySlots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setDeliverySlot(slot.value)}
                  className={`p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                    deliverySlot === slot.value
                      ? 'border-primary-500 bg-primary-50 text-primary-800 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                  }`}
                >
                  <span className="text-sm">{slot.label}</span>
                  {deliverySlot === slot.value && (
                    <div className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0 ml-1">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {deliverySlot === 'Custom Time Slot' && (
              <div className="mt-4 pt-2 border-t border-dashed border-slate-100 animate-fadeIn">
                <label htmlFor="customSlot" className="text-xs font-semibold text-slate-600 block mb-1">Custom Delivery Slot Details</label>
                <input
                  id="customSlot"
                  type="text"
                  placeholder="e.g. 10:30 PM after my lab class"
                  className="input-field text-sm"
                  value={customSlot}
                  onChange={(e) => setCustomSlot(e.target.value)}
                  required
                />
              </div>
            )}
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
                    <li>On laptop/desktop, you can choose to enter a UPI ID or scan the dynamically generated QR code inside the Razorpay Checkout popup.</li>
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

          {/* Pricing list */}
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
            {deliveryCharge > 0 && (
              <div className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg leading-relaxed">
                Add <strong>₹{100 - total}</strong> more to your cart to get <strong>FREE delivery</strong>!
              </div>
            )}
            <div className="border-t border-slate-100 pt-3 flex justify-between text-slate-800 font-extrabold text-base">
              <span>Total Amount</span>
              <span>₹{finalTotal}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 flex items-center justify-center space-x-2 text-sm shadow-md hover:shadow-lg"
          >
            <span>{loading ? 'Processing...' : 'Place Room Order'}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </form>

      {showSimulatedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg">Razorpay Checkout</h3>
                <p className="text-xs text-indigo-100/80">HostelKart Room Order Payment (Simulation)</p>
              </div>
              <button 
                type="button" 
                onClick={handleCancelSimulatedPayment}
                className="text-white hover:text-indigo-200 text-sm font-bold bg-white/10 px-2.5 py-1 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Error Message */}
            {simulatedError && (
              <div className="bg-red-50 border-b border-red-100 px-6 py-3 text-red-700 text-xs font-semibold">
                ⚠️ {simulatedError}
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setSimulatedTab('card')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                  simulatedTab === 'card'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                💳 Card
              </button>
              <button
                type="button"
                onClick={() => setSimulatedTab('upi')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                  simulatedTab === 'upi'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                📱 UPI ID
              </button>
              <button
                type="button"
                onClick={() => setSimulatedTab('qr')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                  simulatedTab === 'qr'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                📸 QR Code
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              {simulatedTab === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Card Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 4111 1111 1111 1111"
                      className="input-field text-sm mt-1"
                      value={simulatedCard}
                      onChange={(e) => setSimulatedCard(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY (e.g. 12/26)"
                        className="input-field text-sm mt-1"
                        value={simulatedExpiry}
                        onChange={(e) => setSimulatedExpiry(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">CVV</label>
                      <input
                        type="password"
                        placeholder="123"
                        maxLength={3}
                        className="input-field text-sm mt-1"
                        value={simulatedCvv}
                        onChange={(e) => setSimulatedCvv(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-400 leading-relaxed border border-slate-100">
                    💡 <strong>Test card details:</strong> Use Card <code>4111 1111 1111 1111</code>, CVV <code>123</code>, Expiry <code>12/26</code> to pass the simulation.
                  </div>
                </div>
              )}

              {simulatedTab === 'upi' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">UPI ID / VPA</label>
                    <input
                      type="text"
                      placeholder="e.g. test@razorpay"
                      className="input-field text-sm mt-1"
                      value={simulatedUpi}
                      onChange={(e) => setSimulatedUpi(e.target.value)}
                    />
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-400 leading-relaxed border border-slate-100">
                    💡 <strong>Test UPI details:</strong> Use UPI ID <code>test@razorpay</code> to pass the simulation.
                  </div>
                </div>
              )}

              {simulatedTab === 'qr' && (
                <div className="flex flex-col items-center justify-center space-y-3 p-4">
                  <div className="w-40 h-40 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 font-extrabold text-xs shadow-inner">
                    <div className="grid grid-cols-5 gap-1.5 p-3 w-full h-full opacity-60">
                      {[...Array(25)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`rounded-sm ${(i * 7 + 3) % 2 === 0 || i < 5 || i % 5 === 0 || i > 20 ? 'bg-indigo-900' : 'bg-transparent'}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold text-center">
                    📸 Scan this simulated QR code with any UPI app to complete payment.
                  </p>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-black text-slate-800">
                Amount: ₹{finalTotal}
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleCancelSimulatedPayment}
                  disabled={simulatedLoading}
                  className="px-4 py-3 min-h-[48px] text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-all flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSimulatedPayment}
                  disabled={simulatedLoading}
                  className="px-5 py-3 min-h-[48px] text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
                >
                  {simulatedLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Pay Now</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Checkout;
