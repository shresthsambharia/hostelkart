import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Users, HelpCircle, LogOut, ChevronRight, Truck, User, Settings, X, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Manage Products', path: '/admin/products', icon: <ShoppingBag size={20} /> },
    { name: 'Manage Orders', path: '/admin/orders', icon: <ShoppingCart size={20} /> },
    { name: 'Manage Coupons', path: '/admin/coupons', icon: <Tag size={20} /> },
    { name: 'View Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Custom Requests', path: '/admin/custom-requests', icon: <HelpCircle size={20} /> },
    { name: 'Payment Settings', path: '/admin/settings', icon: <Settings size={20} /> },
    { name: 'My Profile', path: '/profile', icon: <User size={20} /> },
  ];

  const deliveryLinks = [
    { name: 'Assigned Orders', path: '/delivery/dashboard', icon: <Truck size={20} /> },
    { name: 'Delivery History', path: '/delivery/history', icon: <LayoutDashboard size={20} /> },
    { name: 'My Profile', path: '/profile', icon: <User size={20} /> },
  ];

  const links = user?.role === 'admin' ? adminLinks : deliveryLinks;

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0 transform transition-transform duration-300 md:sticky md:top-16 md:translate-x-0 md:h-[calc(100vh-4rem)] h-full ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="py-6 px-4 space-y-6 relative">
        {/* Close button for mobile */}
        <button 
          onClick={onClose} 
          className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg absolute top-4 right-4 transition-colors focus:outline-none" 
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* User Identity Panel */}
        <div className="px-3 py-4 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-lg">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <h4 className="text-sm font-bold text-white truncate">{user?.name}</h4>
            <span className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider">
              {user?.role} Portal
            </span>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                {link.icon}
                <span>{link.name}</span>
              </div>
              <ChevronRight size={14} className="opacity-50" />
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout button at bottom */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
        >
          <LogOut size={20} className="mr-3" />
          <span>Exit Portal</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
