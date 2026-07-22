import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900/60 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand logo & status */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <span className="text-xl font-black text-white tracking-tight">
              Hostel<span className="text-primary-500">Kart</span>
            </span>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-semibold">
              IIT Corridor room-door dispatch logs. Order soft drinks, fresh apples, stationery packs, and hygiene essentials in customizable time slots.
            </p>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider space-y-1">
              <p>HostelKart Delivery Service &copy; {new Date().getFullYear()}</p>
              <p>Fulfilling campus demands 24/7</p>
            </div>
          </div>

          {/* Categories Quick Links */}
          <div className="space-y-3">
            <h3 className="text-white text-xs font-black tracking-widest uppercase">Categories</h3>
            <ul className="space-y-2 text-xs font-bold uppercase">
              <li>
                <Link to="/products?category=Fruits" className="hover:text-primary-500 transition-colors">Fruits & Vegetables</Link>
              </li>
              <li>
                <Link to="/products?category=Stationery" className="hover:text-primary-500 transition-colors">Stationery Catalog</Link>
              </li>
              <li>
                <Link to="/products?category=Personal Care" className="hover:text-primary-500 transition-colors">Hygiene Care</Link>
              </li>
              <li>
                <Link to="/products?category=Dairy Products" className="hover:text-primary-500 transition-colors">Dairy Products</Link>
              </li>
            </ul>
          </div>

          {/* Account & Support links */}
          <div className="space-y-3">
            <h3 className="text-white text-xs font-black tracking-widest uppercase">Support</h3>
            <ul className="space-y-2 text-xs font-bold uppercase">
              <li>
                <Link to="/profile" className="hover:text-primary-500 transition-colors">Student Profile</Link>
              </li>
              <li>
                <Link to="/myorders" className="hover:text-primary-500 transition-colors">Track Orders</Link>
              </li>
              <li>
                <Link to="/custom-request" className="hover:text-primary-500 transition-colors">Custom Room Request</Link>
              </li>
              <li className="text-[10px] text-slate-500 font-bold leading-normal lowercase pt-1 normal-case">
                supporthostelkart@gmail.com
              </li>
            </ul>
          </div>
        </div>

        {/* WhatsApp links */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 border-t border-slate-900 pt-6">
          <a 
            href="https://chat.whatsapp.com/DW9mFovIExGBjhLOx9dQYU" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs font-black text-emerald-400 bg-emerald-950/20 px-4 py-2 rounded-xl border border-emerald-900/35 hover:bg-emerald-950/30 transition-all uppercase tracking-wider"
          >
            💬 Boys Hostel WhatsApp Group
          </a>
          <a 
            href="https://chat.whatsapp.com/GWDywmfUeOz2YYix89pk60" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs font-black text-emerald-400 bg-emerald-950/20 px-4 py-2 rounded-xl border border-emerald-900/35 hover:bg-emerald-950/30 transition-all uppercase tracking-wider"
          >
            💬 Girls Hostel WhatsApp Group
          </a>
        </div>

        <div className="pt-6 border-t border-slate-900 text-center text-[10px] text-slate-500 font-bold uppercase flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>Assigned student riders confirm delivery OTP at your block room corridors.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/about" className="hover:text-slate-400 transition-colors">About</Link>
            <Link to="/contact" className="hover:text-slate-400 transition-colors">Contact</Link>
            <Link to="/privacy-policy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
            <Link to="/refund-policy" className="hover:text-slate-400 transition-colors">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
