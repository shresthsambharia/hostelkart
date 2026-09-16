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
              HostelKart delivery updates and room-door dispatch services. Order soft drinks, fresh apples, stationery packs, and hygiene essentials in customizable time slots.
            </p>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider space-y-1">
              <p>HOSTELKART &copy; 2026 / HOSTEL ESSENTIALS &amp; DELIVERY</p>
              <p>Fulfilling campus demands 24/7</p>
            </div>
          </div>

          {/* Categories Quick Links */}
          <div className="space-y-3">
            <h3 className="text-white text-xs font-black tracking-widest uppercase">Categories</h3>
            <ul className="space-y-2 text-xs font-bold uppercase">
              <li>
                <Link to="/products?category=Fruits" className="hover:text-primary-500 transition-colors">Fruits</Link>
              </li>
              <li>
                <Link to="/products?category=Medicines" className="hover:text-primary-500 transition-colors">Medicines</Link>
              </li>
              <li>
                <Link to="/products?category=Stationery" className="hover:text-primary-500 transition-colors">Stationery</Link>
              </li>
              <li>
                <Link to="/products?category=Exotic%20Fruits" className="hover:text-primary-500 transition-colors">Exotic Fruits</Link>
              </li>
              <li>
                <Link to="/products?category=Clothes%20Essentials" className="hover:text-primary-500 transition-colors">Clothes Essentials</Link>
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
