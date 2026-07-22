import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Truck, Check, MapPin, Phone, User, Calendar, ShieldCheck, ChevronLeft, ClipboardList, Package, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { getThumbnail } from '../utils/image';
import { downloadInvoice } from '../utils/invoice';

// React Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Resolve leaflet marker icon issues in React builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const OrderTracking = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: loggedInUser } = useAuth();

  const [riderLocation, setRiderLocation] = useState(null);
  const [distanceRemaining, setDistanceRemaining] = useState(null);
  const [eta, setEta] = useState(null);

  // WebSockets tracker listener
  useEffect(() => {
    if (!id) return;

    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : (import.meta.env.VITE_API_URL || 'https://hostelkart-backend.onrender.com');
    const socketServerURL = host.endsWith('/api') ? host.replace('/api', '') : host;
    
    console.log("[Socket] Connecting student tracker:", socketServerURL);
    const socket = io(socketServerURL);

    socket.emit('join_order_track', { orderId: id });

    socket.on('location_updated', (data) => {
      setRiderLocation({ lat: data.lat, lng: data.lng });
      setDistanceRemaining(data.distanceRemaining);
      setEta(data.eta);
    });

    socket.on('status_updated', (data) => {
      fetchOrderDetails();
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const { data } = await orderAPI.getById(id);
      setOrder(data);
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    const reason = window.prompt("Enter reason for cancellation:", "Student requested");
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
    await downloadInvoice(order, loggedInUser);
  };

  useEffect(() => {
    fetchOrderDetails();
    const interval = setInterval(fetchOrderDetails, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 bg-slate-50/50">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary-600 animate-spin"></div>
        </div>
        <p className="text-xs font-bold text-slate-455 animate-pulse uppercase tracking-wider">Loading tracking details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4 select-none">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Order Not Found</h2>
        <p className="text-slate-500 text-xs font-bold uppercase">The order tracking details could not be found.</p>
        <Link to="/myorders" className="btn-primary py-2.5 px-5 inline-block">Back to My Orders</Link>
      </div>
    );
  }

  const steps = [];
  if (order.paymentMethod === 'UPI') {
    steps.push(
      { name: 'Pending Payment', label: 'Pending Payment', desc: 'Awaiting student UPI transfer' },
      { name: 'Payment Submitted', label: 'Payment Submitted', desc: 'UTR & Receipt submitted, verifying' }
    );
  }
  steps.push(
    { name: 'Pending', label: 'Order Placed', desc: 'Awaiting shop confirmation' },
    { name: 'Confirmed', label: 'Confirmed', desc: 'Rider assigned to order' },
    { name: 'Packed', label: 'Packed', desc: 'Prepared at store counter' },
    { name: 'Out for Delivery', label: 'Out for Delivery', desc: 'Rider en-route to your room' },
    { name: 'Delivered', label: 'Delivered', desc: 'Order arrived safely' }
  );

  const getStepIndex = (status) => {
    if (status === 'Cancelled' || status === 'Payment Expired') return -1;
    let mappedStatus = status;
    if (['Verification Pending', 'Pending Verification', 'Payment Pending Verification'].includes(status)) {
      mappedStatus = 'Payment Submitted';
    }
    if (status === 'Paid') {
      mappedStatus = 'Pending';
    }
    return steps.findIndex(x => x.name === mappedStatus);
  };

  const currentStepIdx = getStepIndex(order.orderStatus);

  const getStepIcon = (name, isCompleted) => {
    const size = 12;
    const color = isCompleted ? "text-white stroke-[2.5]" : "text-slate-400 stroke-[2]";
    switch (name) {
      case 'Pending Payment':
        return <Clock size={size} className={color} />;
      case 'Payment Submitted':
        return <Check size={size} className={color} />;
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

  const hostelCoords = [13.0827, 80.2707];
  const riderCoords = riderLocation ? [riderLocation.lat, riderLocation.lng] : [13.0812, 80.2681];

  const hostelIcon = L.divIcon({
    html: `<div class="w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg text-sm select-none">🏠</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const riderIcon = L.divIcon({
    html: `<div class="w-9 h-9 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg text-base animate-bounce select-none">🚴</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24">
      {/* Back link */}
      <div>
        <Link to="/myorders" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-primary-650 uppercase tracking-wider">
          <ChevronLeft size={14} />
          <span>Back to My Orders</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-premium">
        <div className="space-y-1">
          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">TRACKING ROOM DISPATCH</span>
          <h1 className="text-lg font-black text-slate-900">Order #{order._id.substring(12).toUpperCase()}</h1>
          <p className="text-[10px] text-slate-550 font-bold uppercase flex items-center gap-1 mt-1 select-none">
            <Calendar size={12} className="text-slate-400" />
            <span>Placed: {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>

        <div className="sm:text-right select-none">
          <span className="text-[9px] text-slate-400 font-black block uppercase">Grand Total</span>
          <span className="text-xl font-black text-slate-900">₹{order.totalAmount}</span>
        </div>
      </div>

      {/* Action panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-premium">
        <button
          type="button"
          onClick={() => handleDownloadInvoice(order)}
          className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 transition-colors shadow-sm"
        >
          Download Invoice PDF
        </button>

        {(order.orderStatus === 'Pending' || order.orderStatus === 'Confirmed') && (
          <button
            type="button"
            onClick={handleCancelOrder}
            className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl border border-rose-200 transition-colors shadow-sm"
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* Timeline tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-6">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">
            Live Delivery Timeline
          </h3>

          {order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivery Failed' ? (
            <div className="space-y-5">
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-6 rounded-2xl text-center space-y-3">
                <h4 className="font-black text-sm uppercase">
                  This order has been {order.orderStatus === 'Delivery Failed' ? 'marked as Delivery Failed' : 'Cancelled'}
                </h4>
                {order.cancellationReason && (
                  <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-rose-100 max-w-md mx-auto italic font-bold">
                    Reason: "{order.cancellationReason}"
                  </p>
                )}
                {['ONLINE', 'CASHFREE'].includes(order.paymentMethod) && order.paymentStatus === 'Paid' && (
                  <p className="text-xs text-primary-700 font-bold bg-primary-50 border border-primary-100 p-2.5 rounded-xl max-w-md mx-auto animate-pulse">
                    ⚡ Prepaid payment detected. Refund is being processed.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="relative pl-10 space-y-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 select-none">
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={step.name} className="relative flex flex-col items-start gap-1">
                    <div
                      className={`absolute -left-[35px] top-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-400'
                      } ${isCurrent ? 'ring-4 ring-primary-100 animate-pulse scale-105' : ''}`}
                    >
                      {getStepIcon(step.name, isCompleted)}
                    </div>

                    <h4 className={`text-xs font-black leading-none ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </h4>
                    
                    <p className={`text-[10px] font-bold ${isCompleted ? 'text-slate-500' : 'text-slate-400'}`}>
                      {step.desc}
                    </p>

                    {isCompleted && order.timeline.find(t => t.status === step.name) && (
                      <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                        {new Date(order.timeline.find(t => t.status === step.name).timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Map layout for Out for Delivery */}
          {order.orderStatus === 'Out for Delivery' && (
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium space-y-4 mt-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Rider Location Dispatch</span>
                </h3>
                {distanceRemaining !== null && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">
                    {distanceRemaining} km away • {eta} mins ETA
                  </span>
                )}
              </div>
              <div style={{ height: '280px', minHeight: '280px' }} className="w-full rounded-2xl border border-slate-200 overflow-hidden shadow-inner z-10">
                <MapContainer center={hostelCoords} zoom={16} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={hostelCoords} icon={hostelIcon}>
                    <Popup>Your Room Location</Popup>
                  </Marker>
                  <Marker position={riderCoords} icon={riderIcon}>
                    <Popup>Delivery Rider</Popup>
                  </Marker>
                  <Polyline positions={[riderCoords, hostelCoords]} color="#10b981" weight={4} />
                </MapContainer>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          {/* OTP */}
          {order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled' && order.deliveryOtp && (
            <div className="bg-primary-50 p-6 rounded-3xl border border-primary-100 shadow-premium text-center space-y-2 select-none">
              <span className="text-[9px] font-black text-primary-400 uppercase tracking-widest block">DELIVERY VERIFICATION CODE</span>
              <span className="text-3xl font-black text-primary-700 tracking-widest block font-mono">{order.deliveryOtp}</span>
              <p className="text-[10px] text-slate-500 font-bold leading-normal uppercase">
                Share this security code with the rider at your room door to confirm delivery.
              </p>
            </div>
          )}

          {/* Address */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5 select-none">
              <MapPin size={14} className="text-primary-600" />
              <span>Room Destination</span>
            </h3>
            
            <div className="text-xs text-slate-655 space-y-1.5 font-bold">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Recipient Name</span>
                <span>{order.deliveryDetails?.name || order.user?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Destination Room</span>
                <span>{order.deliveryDetails?.hostelName}, Block {order.deliveryDetails?.block}, Floor {order.deliveryDetails?.floor}, Room {order.deliveryDetails?.roomNumber}</span>
              </div>
              {order.deliveryDetails?.landmark && (
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Landmark</span>
                  <span>{order.deliveryDetails.landmark}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Contact Number</span>
                <span>{order.deliveryDetails?.phone}</span>
              </div>
              {order.deliveryDetails?.alternatePhone && (
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Alternate Number</span>
                  <span>{order.deliveryDetails.alternatePhone}</span>
                </div>
              )}
              {order.deliveryDetails?.deliveryInstructions && (
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Instructions</span>
                  <span>{order.deliveryDetails.deliveryInstructions}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
