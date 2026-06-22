import React, { useState, useEffect } from 'react';
import { deliveryAPI } from '../api';
import { Truck, CheckCircle2, Phone, MapPin, Package, ClipboardCheck, Play } from 'lucide-react';
import { getThumbnail } from '../utils/image';
import { io } from 'socket.io-client';

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [failingOrderId, setFailingOrderId] = useState(null);
  const [failureReason, setFailureReason] = useState('Student unavailable');
  const [customReason, setCustomReason] = useState('');

  const fetchAssigned = async () => {
    try {
      const { data } = await deliveryAPI.getAssignedOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching assigned deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateMovement = (orderId) => {
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : (import.meta.env.VITE_API_URL || 'https://hostelkart-backend.onrender.com');
    const socketServerURL = host.endsWith('/api') ? host.replace('/api', '') : host;
    
    console.log("[Socket] Connecting delivery partner to socket at:", socketServerURL);
    const socket = io(socketServerURL);

    const coordinates = [
      { lat: 13.0812, lng: 80.2681, distanceRemaining: 0.5, eta: 5 },
      { lat: 13.0816, lng: 80.2687, distanceRemaining: 0.4, eta: 4 },
      { lat: 13.0820, lng: 80.2694, distanceRemaining: 0.2, eta: 2 },
      { lat: 13.0824, lng: 80.2701, distanceRemaining: 0.1, eta: 1 },
      { lat: 13.0827, lng: 80.2707, distanceRemaining: 0.0, eta: 0 }
    ];

    console.log("Before click coordinates", coordinates[0]);
    let stepIndex = 0;
    setAlert({ type: 'success', message: 'Simulated rider movement started! Open student tracking screen to view.' });

    const intervalId = setInterval(() => {
      if (stepIndex >= coordinates.length) {
        clearInterval(intervalId);
        socket.disconnect();
        setAlert({ type: 'success', message: 'Simulated rider arrived at destination!' });
        return;
      }

      const step = coordinates[stepIndex];
      console.log("After click coordinates", step);

      const payload = {
        orderId,
        lat: step.lat,
        lng: step.lng,
        distanceRemaining: step.distanceRemaining,
        eta: step.eta
      };
      
      console.log("Socket payload emitted", payload);
      socket.emit('update_location', payload);

      stepIndex++;
    }, 2000);
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus, note) => {
    setAlert({ type: '', message: '' });
    let otp = undefined;

    if (newStatus === 'Delivered') {
      otp = window.prompt("Ask student for their 4-digit Delivery OTP and enter it here to confirm delivery:");
      if (otp === null) return; // cancel operation
      if (!/^\d{4}$/.test(otp.trim())) {
        setAlert({
          type: 'error',
          message: 'Delivery OTP must be exactly a 4-digit number'
        });
        return;
      }
    }

    try {
      await deliveryAPI.updateStatus(orderId, newStatus, note, otp?.trim());
      setAlert({
        type: 'success',
        message: `Order status updated successfully!`
      });
      fetchAssigned();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update order status'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Packed': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Out for Delivery': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Active Deliveries</h1>
        <p className="text-sm text-slate-500">View your assigned hostel orders, check addresses, and update delivery statuses</p>
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

      {/* Grid list of active orders */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center space-y-3">
          <div className="text-5xl">🚲</div>
          <h3 className="font-bold text-slate-700 text-lg">No Active Deliveries</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            You are fully caught up! Any new orders assigned to you by the manager will show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map((ord) => (
            <div
              key={ord._id}
              className="bg-white rounded-2xl border border-slate-100/80 shadow-premium overflow-hidden p-5 sm:p-6 hover:shadow-premium-hover transition-all flex flex-col justify-between space-y-5"
            >
              {/* Header block */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
                <span className="font-mono font-black text-slate-900 text-sm">
                  #{ord._id.substring(12).toUpperCase()}
                </span>
                <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${getStatusColor(ord.orderStatus)}`}>
                  {ord.orderStatus}
                </span>
              </div>

              {/* Customer details address */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin size={18} className="text-primary-650 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 space-y-1.5 flex-1">
                    <p className="font-extrabold text-slate-800 text-sm leading-tight">
                      {ord.deliveryDetails?.hostelName}
                    </p>
                    <p className="font-semibold text-slate-700">
                      Block {ord.deliveryDetails?.block}, Room {ord.deliveryDetails?.roomNumber} ({ord.deliveryDetails?.floor || 'Floor N/A'})
                    </p>
                    {ord.deliveryDetails?.landmark && (
                      <p className="text-amber-700 font-bold bg-amber-50 border border-amber-100/50 px-2 py-0.5 rounded w-fit text-[10px]">
                        Landmark: {ord.deliveryDetails.landmark}
                      </p>
                    )}
                    <p className="text-slate-800 font-semibold">
                      Preferred Time: <span className="text-primary-700 font-bold">{ord.deliverySlot}</span>
                    </p>
                    {ord.deliveryDetails?.deliveryInstructions && (
                      <div className="text-[10px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-150/60 leading-normal">
                        Instructions: "{ord.deliveryDetails.deliveryInstructions}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct calling and maps actions */}
                <div className="flex flex-wrap gap-2.5 pt-1.5">
                  <a
                    href={`tel:${ord.deliveryDetails?.phone}`}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Phone size={13} />
                    <span>Call {ord.user?.name || 'Student'}</span>
                  </a>
                  {ord.deliveryDetails?.alternatePhone && (
                    <a
                      href={`tel:${ord.deliveryDetails?.alternatePhone}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Phone size={13} />
                      <span>Alt Call</span>
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ord.deliveryDetails?.hostelName + ', Block ' + ord.deliveryDetails?.block + ', ' + (ord.deliveryDetails?.roomNumber || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <MapPin size={13} className="text-slate-500" />
                    <span>Open Map</span>
                  </a>
                </div>
              </div>

              {/* Items listing summaries */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center space-x-1">
                  <Package size={12} />
                  <span>Items List ({ord.items.reduce((a, b) => a + b.quantity, 0)})</span>
                </span>

                <div className="divide-y divide-slate-150/60 space-y-1.5 text-xs">
                  {ord.items.map((it) => (
                    <div key={it._id} className="pt-1.5 flex items-center justify-between font-medium text-slate-650 gap-2">
                      <div className="flex items-center space-x-2 truncate">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50">
                          <img
                            src={getThumbnail(it.product || it)}
                            alt={it.name}
                            loading="lazy"
                            decoding="async"
                            width={32}
                            height={32}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getThumbnail(null);
                            }}
                          />
                        </div>
                        <span className="truncate">
                          <span className="font-extrabold text-slate-800">{it.quantity}x</span> {it.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 shrink-0">₹{it.price * it.quantity}</span>
                    </div>
                  ))}
                  <div className="pt-2.5 flex justify-between font-black text-slate-900 flex-wrap gap-2 items-center text-xs">
                    <span>Collect Pay:</span>
                    <div className="flex items-center space-x-1.5">
                      {ord.paymentStatus === 'Paid' && (
                        <>
                          <span className="line-through text-slate-405">₹{ord.totalAmount}</span>
                          <span className="text-emerald-700 font-black">₹0</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            PAID
                          </span>
                        </>
                      )}
                      {ord.paymentStatus === 'Verification Pending' && (
                        <>
                          <span className="line-through text-slate-405">₹{ord.totalAmount}</span>
                          <span className="text-emerald-700 font-black">₹0</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                            PENDING VERIFY
                          </span>
                        </>
                      )}
                      {ord.paymentStatus === 'Pending' && (
                        <>
                          <span className="text-slate-900 font-black">₹{ord.totalAmount}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                            COD CASH
                          </span>
                        </>
                      )}
                      {ord.paymentStatus === 'Failed' && (
                        <>
                          <span className="text-red-650 font-black">FAILED</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                            REJECTED
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {ord.paymentStatus === 'Paid' && (
                    <div className="mt-2 text-[9px] font-black text-center bg-emerald-50 border border-emerald-100 text-emerald-700 py-2 rounded-lg leading-none tracking-wide">
                      🛡️ ONLINE PREPAID. DO NOT COLLECT CASH!
                    </div>
                  )}
                  {ord.paymentStatus === 'Verification Pending' && (
                    <div className="mt-2 text-[9px] font-black text-center bg-blue-50 border border-blue-100 text-blue-700 py-2 rounded-lg leading-none tracking-wide">
                      🛡️ ONLINE PREPAID (Verify pending). DO NOT COLLECT CASH! {ord.utrNumber ? `(UTR: ${ord.utrNumber})` : ''}
                    </div>
                  )}
                  {ord.paymentStatus === 'Pending' && (
                    <div className="mt-2 text-[9px] font-black text-center bg-amber-50 border border-amber-150 text-amber-850 py-2 rounded-lg leading-none tracking-wide">
                      💵 CASH ON DELIVERY. COLLECT ₹{ord.totalAmount} IN CASH!
                    </div>
                  )}
                  {ord.paymentStatus === 'Failed' && (
                    <div className="mt-2 text-[9px] font-black text-center bg-red-50 border border-red-100 text-red-705 py-2 rounded-lg leading-none">
                      ❌ PAYMENT REJECTED / CANCELLED.
                    </div>
                  )}
                </div>
              </div>

              {/* Action transitions buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                {ord.orderStatus === 'Confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(ord._id, 'Packed')}
                    className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <ClipboardCheck size={14} />
                    <span>Confirm Packed</span>
                  </button>
                )}

                {ord.orderStatus === 'Packed' && (
                  <button
                    onClick={() => handleUpdateStatus(ord._id, 'Out for Delivery')}
                    className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 bg-amber-600 hover:bg-amber-700 shadow-sm"
                  >
                    <Truck size={14} />
                    <span>Start Room Delivery</span>
                  </button>
                )}

                {ord.orderStatus === 'Out for Delivery' && (
                  <div className="w-full space-y-3">
                    <button
                      onClick={() => simulateMovement(ord._id)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-amber-500/10 flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Play size={12} className="fill-white" />
                      <span>Simulate Rider GPS Movement</span>
                    </button>
                    <div className="w-full grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleUpdateStatus(ord._id, 'Delivered', 'Delivered directly to room')}
                        className="btn-primary py-2.5 px-1 text-[10px] font-black flex items-center justify-center space-x-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm rounded-xl leading-none"
                      >
                        <CheckCircle2 size={12} />
                        <span>Delivered</span>
                      </button>
                    <button
                      onClick={() => handleUpdateStatus(ord._id, 'Delivered', 'Left with security guard')}
                      className="btn-primary py-2.5 px-1 text-[10px] font-black flex items-center justify-center space-x-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm rounded-xl leading-none"
                    >
                      <ClipboardCheck size={12} />
                      <span>Left Guard</span>
                    </button>
                    <button
                      onClick={() => {
                        setFailingOrderId(ord._id);
                        setFailureReason('Student unavailable');
                      }}
                      className="btn-primary py-2.5 px-1 text-[10px] font-black flex items-center justify-center space-x-1 bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-sm rounded-xl leading-none"
                    >
                      <span>✕</span>
                      <span>Failed</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      {failingOrderId && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Report Delivery Failure</h3>
              <p className="text-xs text-slate-400">Please choose a reason why this room delivery could not be completed.</p>
            </div>
            
            {/* Warning for prepaid orders */}
            {(() => {
              const ord = orders.find(o => o._id === failingOrderId);
              if (ord && ['ONLINE', 'RAZORPAY'].includes(ord.paymentMethod) && ord.paymentStatus === 'Paid') {
                return (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-[11px] text-blue-750 font-semibold leading-relaxed">
                    ℹ️ ONLINE PREPAID ORDER: A refund will be automatically initiated for this student upon failure confirmation.
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-3">
              {[
                'Student unavailable',
                'Wrong room details',
                'Hostel entry denied',
                'Product unavailable',
                'Other'
              ].map((reasonOption) => (
                <label
                  key={reasonOption}
                  className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                    failureReason === reasonOption
                      ? 'border-rose-500 bg-rose-50/50 text-rose-800 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="failureReason"
                    value={reasonOption}
                    checked={failureReason === reasonOption}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>{reasonOption}</span>
                </label>
              ))}

              {failureReason === 'Other' && (
                <div className="pt-2 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Specify Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Hostel lift is under maintenance, cannot reach floor"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-semibold"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFailingOrderId(null);
                  setCustomReason('');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const finalNote = failureReason === 'Other' ? customReason.trim() : failureReason;
                  if (failureReason === 'Other' && !finalNote) {
                    alert('Please specify the delivery failure reason.');
                    return;
                  }
                  
                  const targetOrderId = failingOrderId;
                  setFailingOrderId(null);
                  setCustomReason('');
                  await handleUpdateStatus(targetOrderId, 'Delivery Failed', finalNote);
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm"
              >
                Confirm Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
