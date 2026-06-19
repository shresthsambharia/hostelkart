import React from 'react';
import { RefreshCw } from 'lucide-react';

const RefundPolicy = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fadeIn">
      {/* Title */}
      <div className="flex items-center space-x-3 border-b border-slate-100 pb-5">
        <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
          <RefreshCw size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Refund Policy</h1>
          <p className="text-sm text-slate-400">Effective Date: June 12, 2026</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">1. Eligibility for Refunds</h2>
          <p>Refunds are processed for prepaid Direct UPI orders under the following specific circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Orders cancelled by the student while in **Pending** or **Confirmed** status.</li>
            <li>Orders rejected or cancelled by the Admin (e.g., due to stock unavailability or payment verification failure).</li>
            <li>Rider cancellation of delivery due to logistical failure on our end.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">2. Cancellation Refund Rules</h2>
          <p>
            If you cancel a prepaid order before it enters **Packed** status, you are eligible for a **100% refund** of the order value, including platform fees and delivery charges. Refund requests are initiated automatically upon cancellation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">3. Failed Payment / Rejections</h2>
          <p>
            If the administrator rejects your payment status (due to unmatched UTR or incorrect transaction ID), the order status is cancelled. If you paid but entered the wrong UTR, please contact support immediately with your payment screenshot to initiate a manual search and refund.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">4. Wrong or Defective Items</h2>
          <p>
            Because we deliver fresh food, dairy, and personal care products:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Please inspect your package immediately upon delivery.</li>
            <li>If you receive a defective, expired, or wrong product, report it to campus support via email or WhatsApp within **1 hour of delivery**.</li>
            <li>Verified complaints will receive a choice of direct product replacement or a full refund for that specific item.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">5. Processing Timelines</h2>
          <p>
            All direct UPI refunds are reviewed and processed by our finance desk back to your paying UPI VPA. Funds will typically reflect in your bank account within **24 to 48 hours** of approval.
          </p>
        </section>
      </div>
    </div>
  );
};

export default RefundPolicy;
