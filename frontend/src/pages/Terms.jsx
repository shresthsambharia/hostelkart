import React from 'react';
import { FileText } from 'lucide-react';

const Terms = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fadeIn">
      {/* Title */}
      <div className="flex items-center space-x-3 border-b border-slate-100 pb-5">
        <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
          <FileText size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Terms & Conditions</h1>
          <p className="text-sm text-slate-400">Effective Date: June 12, 2026</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">1. Student Responsibilities</h2>
          <p>By registering or placing orders on HostelKart, you guarantee that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You reside on-campus in the specified university hostels.</li>
            <li>You provide accurate name, room number, block wing, floor, and contact phone numbers.</li>
            <li>You will make yourself available at the specified delivery slot and room location to receive orders.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">2. Billing, Fees & Pricing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All orders are subject to a flat **platform fee of ₹15**.</li>
            <li>Orders below ₹100 are subject to a **delivery fee of ₹15**. Orders of ₹100 or above qualify for **FREE room delivery**.</li>
            <li>Items are charged based on listed prices at the time of checkout. Prices include local applicable store taxes.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">3. Payment Methods & Verification</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>**Cash on Delivery (COD)**: Payment must be handed in cash directly to the student rider at the room door on arrival.</li>
            <li>**Direct UPI Payment**: Payments are processed to UPI ID `rawlanineev@okhdfcbank`. You must submit the correct 12-digit transaction UTR reference number. Falsifying UTR numbers is an offense and will lead to account suspension.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">4. Order Cancellations</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Students may cancel an order directly from their panel only while the status is **Pending** or **Confirmed**.</li>
            <li>Once the store prepared items and marked the order as **Packed** or **Out for Delivery**, cancellation is blocked.</li>
            <li>Cancellation restocks the items, and any prepaid amount is eligible for refund as per our Refund Policy.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">5. Delivery Area Limitations</h2>
          <p>
            Delivery is strictly confined to the bounds of the university campus hostels. We do not deliver to staff quarters, administrative buildings, lab corridors, or any locations off the main university campus gates.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
