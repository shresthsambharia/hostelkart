import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, Truck } from 'lucide-react';

const OrderSuccess = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('id') || '';

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center animate-slide-up">
        {/* Animated Drawing Success Checkmark and Confetti */}
        <div className="flex justify-center relative py-4">
          <div className="success-checkmark-wrapper relative z-10">
            <svg className="success-checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="success-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none success-particles">
              <div className="particle p1 bg-emerald-500"></div>
              <div className="particle p2 bg-amber-500"></div>
              <div className="particle p3 bg-indigo-500"></div>
              <div className="particle p4 bg-rose-500"></div>
              <div className="particle p5 bg-emerald-400"></div>
              <div className="particle p6 bg-yellow-500"></div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Order Placed!</h1>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Your daily hostel essentials order has been placed successfully and sent to our store.
          </p>
        </div>

        {orderId && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Order ID</span>
            <span className="text-sm font-mono font-bold text-slate-700 select-all">{orderId}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link
            to={orderId ? `/orders/track/${orderId}` : '/myorders'}
            className="flex-1 btn-primary py-3 flex items-center justify-center space-x-2 text-sm shadow-md hover:shadow-lg"
          >
            <Truck size={18} />
            <span>Track Order</span>
          </Link>
          
          <Link
            to="/products"
            className="flex-1 btn-secondary py-3 flex items-center justify-center space-x-2 text-sm"
          >
            <ShoppingBag size={18} />
            <span>Shop More</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
