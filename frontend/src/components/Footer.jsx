import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Tagline */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <span className="text-xl font-extrabold text-white tracking-tight">
              Hostel<span className="text-primary-400">Kart</span>
            </span>
            <p className="text-sm text-slate-400 max-w-sm">
              Daily hostel essentials delivered to your room. Get snacks, personal care, medicines, stationery, and more delivered in under 30 minutes!
            </p>
            <div className="pt-2 text-xs text-slate-500">
              <p>HostelKart Delivery Service &copy; {new Date().getFullYear()}</p>
              <p className="mt-1">Serving university students 24/7.</p>
            </div>
          </div>

          {/* Categories Quick Links */}
          <div>
            <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/products?category=Snacks" className="hover:text-primary-400 transition-colors">Snacks & Instant Food</Link>
              </li>
              <li>
                <Link to="/products?category=Beverages" className="hover:text-primary-400 transition-colors">Beverages</Link>
              </li>
              <li>
                <Link to="/products?category=Personal Care" className="hover:text-primary-400 transition-colors">Personal Care</Link>
              </li>
              <li>
                <Link to="/products?category=Hostel Essentials" className="hover:text-primary-400 transition-colors">Hostel Essentials</Link>
              </li>
            </ul>
          </div>

          {/* Account & Support */}
          <div>
            <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/profile" className="hover:text-primary-400 transition-colors">My Profile</Link>
              </li>
              <li>
                <Link to="/myorders" className="hover:text-primary-400 transition-colors">Track Orders</Link>
              </li>
              <li>
                <Link to="/custom-request" className="hover:text-primary-400 transition-colors">Request Custom Item</Link>
              </li>
              <li className="text-xs text-slate-500 pt-2">
                Need help? Contact campus support at support@hostelkart.com
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>Designed for college campuses. Quick delivery direct to your block and room.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/about" className="hover:text-slate-300 transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-slate-300 transition-colors">Contact Us</Link>
            <Link to="/privacy-policy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms & Conditions</Link>
            <Link to="/refund-policy" className="hover:text-slate-300 transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
