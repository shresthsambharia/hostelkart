import React from 'react';
import { Shield } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fadeIn">
      {/* Title */}
      <div className="flex items-center space-x-3 border-b border-slate-100 pb-5">
        <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
          <Shield size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-slate-400">Effective Date: June 12, 2026</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">1. Information We Collect</h2>
          <p>We collect essential personal data when you register and place orders on HostelKart. This includes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your Name, Email Address, and Phone Number.</li>
            <li>Your precise hostel room delivery location (Hostel name, Block, Wing, Floor, Room number).</li>
            <li>Direct UPI Transaction UTR Reference IDs entered for payment verification.</li>
            <li>Order history, wishlists, custom item requests, and support communications.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">2. How We Use Your Data</h2>
          <p>We process your information solely to facilitate secure, high-speed room delivery and transaction checks on campus. Specifically:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To dispatch assigned student riders directly to your specific wing and room.</li>
            <li>To verify manually submitted 12-digit UPI UTR numbers with bank transaction statements.</li>
            <li>To send order notifications and status updates via email or phone.</li>
            <li>To analyze and optimize product stock patterns and campus delivery routing times.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">3. Data Sharing Restrictions</h2>
          <p>We take user privacy extremely seriously. We do not sell, rent, or distribute your personal details to external third-party advertisers. Information is only exposed within our controlled campus networks:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Delivery partners are ONLY shown your phone, name, and room address details for active, assigned orders. They cannot view your email or complete billing logs.</li>
            <li>Admins verify transactions internally via secure administrative consoles.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">4. Data Security</h2>
          <p>Your details are stored securely. All client-to-server exchanges are encrypted using secure protocols. Passwords are securely hashed using bcryptjs. Order information is retained under secure parameters in our MongoDB database instances.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">5. Contact Information</h2>
          <p>
            If you have questions, data deletion requests, or concerns about this Privacy Policy, please contact our privacy compliance group at{' '}
            <a href="mailto:support@hostelkart.com" className="text-primary-600 font-bold hover:underline">
              support@hostelkart.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
