import React, { useState, useEffect } from 'react';
import { deliveryAPI } from '../api';
import { Truck, CheckCircle2, Phone, MapPin, Package, ClipboardCheck } from 'lucide-react';

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
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-all flex flex-col justify-between space-y-6"
            >
              {/* Header block */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="font-mono font-bold text-slate-700">
                  #{ord._id.substring(12).toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ord.orderStatus)}`}>
                  {ord.orderStatus}
                </span>
              </div>

              {/* Customer details address */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2.5">
                  <MapPin size={16} className="text-primary-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800 text-sm">
                      {ord.deliveryDetails?.hostelName}
                    </p>
                    <p>
                      Block {ord.deliveryDetails?.block}, Room {ord.deliveryDetails?.roomNumber} (Floor {ord.deliveryDetails?.floor})
                    </p>
                    {ord.deliveryDetails?.landmark && (
                      <p className="text-amber-700 font-bold">
                        Landmark: {ord.deliveryDetails.landmark}
                      </p>
                    )}
                    <p className="text-slate-800 font-bold">
                      Time Slot: <span className="text-primary-700">{ord.deliverySlot}</span>
                    </p>
                    {ord.deliveryDetails?.deliveryInstructions && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded border border-slate-100">
                        Instructions: {ord.deliveryDetails.deliveryInstructions}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <Phone size={14} className="text-primary-600 shrink-0" />
                    <a
                      href={`tel:${ord.deliveryDetails?.phone}`}
                      className="text-xs font-bold text-primary-600 hover:underline"
                    >
                      {ord.deliveryDetails?.phone} ({ord.user?.name})
                    </a>
                  </div>
                  {ord.deliveryDetails?.alternatePhone && (
                    <div className="flex items-center space-x-2.5 pl-6">
                      <span className="text-[10px] text-slate-400 font-bold">Alt Phone:</span>
                      <a
                        href={`tel:${ord.deliveryDetails?.alternatePhone}`}
                        className="text-xs font-bold text-slate-500 hover:underline"
                      >
                        {ord.deliveryDetails?.alternatePhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Items listing summaries */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center space-x-1">
                  <Package size={12} />
                  <span>Items List ({ord.items.reduce((a, b) => a + b.quantity, 0)})</span>
                </span>

                <div className="divide-y divide-slate-100 space-y-1 text-xs">
                  {ord.items.map((it) => (
                    <div key={it._id} className="pt-1 flex justify-between font-medium text-slate-600">
                      <span className="truncate pr-3">
                        <span className="font-extrabold text-slate-800">{it.quantity}x</span> {it.name}
                      </span>
                      <span className="font-bold text-slate-700 shrink-0">₹{it.price * it.quantity}</span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-extrabold text-slate-800 flex-wrap gap-2 items-center">
                    <span>Collect Pay:</span>
                    <div className="flex items-center space-x-1.5">
                      {ord.paymentStatus === 'Paid' && (
                        <>
                          <span className="line-through text-slate-400">₹{ord.totalAmount}</span>
                          <span className="text-emerald-600 font-extrabold">₹0</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            PAID
                          </span>
                        </>
                      )}
                      {ord.paymentStatus === 'Verification Pending' && (
                        <>
                          <span className="line-through text-slate-400">₹{ord.totalAmount}</span>
                          <span className="text-emerald-600 font-extrabold">₹0</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                            VERIFICATION PENDING
                          </span>
                        </>
                      )}
                      {ord.paymentStatus === 'Pending' && (
                        <>
                          <span className="text-slate-800">₹{ord.totalAmount}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                            COD PENDING
                          </span>
                        </>
                      )}
                      {ord.paymentStatus === 'Failed' && (
                        <>
                          <span className="text-red-600 font-extrabold">FAILED</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
                            REJECTED
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {ord.paymentStatus === 'Paid' && (
                    <div className="mt-2 text-[10px] font-extrabold text-center bg-emerald-50 border border-emerald-100 text-emerald-700 py-1.5 rounded-lg leading-none animate-pulse">
                      🛡️ ONLINE PREPAID. DO NOT COLLECT CASH!
                    </div>
                  )}
                  {ord.paymentStatus === 'Verification Pending' && (
                    <div className="mt-2 text-[10px] font-extrabold text-center bg-blue-50 border border-blue-100 text-blue-700 py-1.5 rounded-lg leading-none">
                      🛡️ ONLINE PREPAID (Verification Pending). DO NOT COLLECT CASH! {ord.utrNumber ? `(UTR: ${ord.utrNumber})` : ''}
                    </div>
                  )}
                  {ord.paymentStatus === 'Pending' && (
                    <div className="mt-2 text-[10px] font-extrabold text-center bg-amber-50 border border-amber-100 text-amber-700 py-1.5 rounded-lg leading-none">
                      💵 CASH ON DELIVERY. COLLECT ₹{ord.totalAmount} IN CASH!
                    </div>
                  )}
                  {ord.paymentStatus === 'Failed' && (
                    <div className="mt-2 text-[10px] font-extrabold text-center bg-red-50 border border-red-100 text-red-700 py-1.5 rounded-lg leading-none">
                      ❌ PAYMENT REJECTED / CANCELLED.
                    </div>
                  )}
                </div>
              </div>

              {/* Action transitions buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-2">
                {ord.orderStatus === 'Confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(ord._id, 'Packed')}
                    className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5"
                  >
                    <ClipboardCheck size={14} />
                    <span>Confirm Packed</span>
                  </button>
                )}

                {ord.orderStatus === 'Packed' && (
                  <button
                    onClick={() => handleUpdateStatus(ord._id, 'Out for Delivery')}
                    className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 bg-amber-600 hover:bg-amber-700"
                  >
                    <Truck size={14} />
                    <span>Start Room Delivery</span>
                  </button>
                )}

                {ord.orderStatus === 'Out for Delivery' && (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(ord._id, 'Delivered', 'Delivered directly to room')}
                      className="btn-primary py-2 px-1 text-[11px] font-extrabold flex items-center justify-center space-x-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm rounded-lg"
                    >
                      <CheckCircle2 size={13} />
                      <span>Room Delivered</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(ord._id, 'Delivered', 'Left with security guard')}
                      className="btn-primary py-2 px-1 text-[11px] font-extrabold flex items-center justify-center space-x-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm rounded-lg"
                    >
                      <ClipboardCheck size={13} />
                      <span>Left with Guard</span>
                    </button>
                    <button
                      onClick={() => {
                        setFailingOrderId(ord._id);
                        setFailureReason('Student unavailable');
                      }}
                      className="btn-primary py-2 px-1 text-[11px] font-extrabold flex items-center justify-center space-x-1 bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-sm rounded-lg"
                    >
                      <span className="text-[13px] leading-none">✕</span>
                      <span>Delivery Failed</span>
                    </button>
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
