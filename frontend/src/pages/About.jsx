import React from 'react';
import { ShoppingBag, ShieldCheck, Zap, Heart } from 'lucide-react';

const About = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12 animate-fadeIn">
      {/* Hero section */}
      <div className="text-center space-y-4">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-700 uppercase tracking-widest">
          About HostelKart
        </span>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight sm:text-5xl">
          Direct to Room <span className="text-primary-600">Hostel Deliveries</span>
        </h1>
        <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
          HostelKart is your campus companion. We deliver fresh fruits, vegetables, dairy products, personal care, electronics accessories, and stationery straight to your hostel wing and room number in under 30 minutes!
        </p>
      </div>

      {/* Grid of features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="p-3 bg-amber-50 rounded-xl w-fit text-amber-600">
            <Zap size={22} />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Under 30 Mins Delivery</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No need to step outside your hostel block. Our student delivery riders know every corridor, lift, and wing on campus.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="p-3 bg-emerald-50 rounded-xl w-fit text-emerald-600">
            <ShoppingBag size={22} />
          </div>
          <h3 className="font-bold text-slate-800 text-base">All Hostel Essentials</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Get instant access to milk, eggs, chocolates, soft drinks, shampoos, notebooks, pens, and basic over-the-counter wellness products.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="p-3 bg-blue-50 rounded-xl w-fit text-blue-600">
            <ShieldCheck size={22} />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Custom Items Request</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Need something not listed in our catalog? Submit a custom request and our team will purchase it from the market for you.
          </p>
        </div>
      </div>

      {/* Deep dive details */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-800 border-b border-slate-100 pb-3">Our Mission</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          As college students, we understand the struggle of late-night study sessions, exam preparation, and heavy classes. Finding time or energy to walk to the campus convenience store or off-campus markets is tough.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          HostelKart was created to build a student-friendly network. We empower student delivery partners with flexible earning opportunities, while providing university residents with seamless access to essentials. We believe in convenience, safety, and community.
        </p>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
          <Heart size={14} className="text-rose-500 fill-rose-500" />
          <span>Made by students, for students.</span>
        </div>
      </div>
    </div>
  );
};

export default About;
