import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, User, ClipboardList, Settings, Users, ShoppingBag, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const MobileBottomNav = () => {
  const { user } = useAuth();
  const { itemsCount } = useCart();
  const location = useLocation();

  // If user is not logged in or is student
  const studentLinks = [
    { name: 'Home', path: '/', icon: <Home size={20} /> },
    { name: 'Shop', path: '/products', icon: <Search size={20} /> },
    { name: 'Orders', path: user ? '/myorders' : '/login', icon: <ClipboardList size={20} /> },
    { name: 'Cart', path: user ? '/cart' : '/login', icon: <ShoppingCart size={20} />, badge: itemsCount },
    { name: 'Profile', path: user ? '/profile' : '/login', icon: <User size={20} /> },
  ];

  const deliveryLinks = [
    { name: 'Dashboard', path: '/delivery/dashboard', icon: <Truck size={20} /> },
    { name: 'History', path: '/delivery/history', icon: <ClipboardList size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
  ];

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <Home size={20} /> },
    { name: 'Orders', path: '/admin/orders', icon: <ClipboardList size={20} /> },
    { name: 'Products', path: '/admin/products', icon: <ShoppingBag size={20} /> },
    { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  let links = studentLinks;
  if (user) {
    if (user.role === 'admin') links = adminLinks;
    else if (user.role === 'delivery') links = deliveryLinks;
  }

  // Helper to determine if a route is active
  const isActiveRoute = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 px-2 py-2.5 flex items-center justify-around md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[calc(10px+safe-area-inset-bottom)]">
      {links.map((link) => {
        const active = isActiveRoute(link.path);
        return (
          <NavLink
            key={link.name}
            to={link.path}
            className={`flex flex-col items-center justify-center relative w-12 text-center transition-colors ${
              active ? 'text-primary-600 font-extrabold scale-105' : 'text-slate-400 font-medium'
            }`}
          >
            <div className="relative p-1">
              {link.icon}
              {link.badge !== undefined && link.badge > 0 && (
                <span className="absolute -top-1 -right-2.5 bg-rose-600 text-white text-[8px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white shrink-0">
                  {link.badge}
                </span>
              )}
            </div>
            <span className="text-[9px] mt-0.5 tracking-tight font-semibold block truncate w-full">{link.name}</span>
          </NavLink>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
