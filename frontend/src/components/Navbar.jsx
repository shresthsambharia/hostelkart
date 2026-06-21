import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, User, LogOut, Search, Menu, X, PlusCircle, LayoutDashboard, ClipboardList, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { notificationAPI } from '../api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { itemsCount } = useCart();
  const [keyword, setKeyword] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const { data } = await notificationAPI.getAll();
        setNotifications(data);
      } catch (error) {
        console.error('Failed to load navbar notifications:', error);
      }
    };
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000);
    return () => clearInterval(timer);
  }, [user]);

  const handleMarkAsRead = async (notifId) => {
    try {
      await notificationAPI.markRead(notifId);
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(keyword)}`);
    } else {
      navigate('/products');
    }
  };

  const handleLogoutClick = () => {
    logout();
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-extrabold text-primary-600 tracking-tight font-sans">
                Hostel<span className="text-slate-800">Kart</span>
              </span>
            </Link>
          </div>

          {/* Search bar (Desktop) - only visible for student/public */}
          {(!user || user.role === 'student') && (
            <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search hostel essentials, fruits, stationery..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-sm transition-all"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <button type="submit" className="absolute right-3 top-2 text-slate-400 hover:text-primary-600" aria-label="Submit Search">
                  <Search size={18} />
                </button>
              </div>
            </form>
          )}

          {/* Navigation Links & Buttons (Desktop) */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Student/Public links */}
            {(!user || user.role === 'student') && (
              <>
                <Link to="/products" className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">
                  Shop
                </Link>
                <Link to="/custom-request" className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">
                  Custom Request
                </Link>
                {user && (
                  <>
                    <Link to="/wishlist" className="relative text-slate-600 hover:text-primary-600 transition-colors" title="Wishlist" aria-label="Wishlist">
                      <Heart size={20} />
                    </Link>
                    <Link to="/myorders" className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">
                      My Orders
                    </Link>
                  </>
                )}
                <Link to="/cart" className="relative text-slate-600 hover:text-primary-600 transition-colors p-2" title="Cart" aria-label="Cart">
                  <ShoppingCart size={20} />
                  {itemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
                      {itemsCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* Admin specific links in Nav */}
            {user && user.role === 'admin' && (
              <Link to="/admin/dashboard" className="flex items-center space-x-1 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">
                <LayoutDashboard size={18} />
                <span>Admin Panel</span>
              </Link>
            )}

            {/* Delivery partner specific links in Nav */}
            {user && user.role === 'delivery' && (
              <Link to="/delivery/dashboard" className="flex items-center space-x-1 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">
                <ClipboardList size={18} />
                <span>Delivery Dashboard</span>
              </Link>
            )}

            {/* Notifications Bell & Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative text-slate-650 hover:text-primary-600 transition-colors p-2 focus:outline-none flex items-center justify-center"
                  title="Notifications"
                  aria-label="Notifications"
                  aria-haspopup="true"
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white animate-bounce shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-fade-in max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <span className="text-xs font-bold text-slate-800">Notifications ({unreadCount} unread)</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-bold text-primary-600 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-6">No notifications yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((notif) => (
                          <div
                            key={notif._id}
                            onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                            className={`p-3 text-xs leading-normal transition-colors cursor-pointer hover:bg-slate-55 ${
                              !notif.isRead ? 'bg-primary-50/30 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-slate-800">{notif.title}</span>
                              {!notif.isRead && (
                                <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0 mt-1"></span>
                              )}
                            </div>
                            <p className="text-slate-500 mt-0.5">{notif.message}</p>
                            <span className="text-[9px] text-slate-400 block mt-1">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User Account / Profile dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 text-sm font-medium text-slate-700 hover:text-primary-600 focus:outline-none py-2"
                  aria-label="User profile menu"
                  aria-haspopup="true"
                  aria-expanded={profileDropdownOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden lg:inline">{user.name.split(' ')[0]}</span>
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-primary-50 text-primary-700">
                        {user.role}
                      </span>
                    </div>

                    <Link
                      to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'delivery' ? '/delivery/dashboard' : '/profile'}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                    >
                      <User size={16} className="mr-2" />
                      My Profile
                    </Link>

                    <button
                      onClick={handleLogoutClick}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} className="mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-primary-600 transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary py-1.5 px-4 text-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-4">
            {(!user || user.role === 'student') && (
              <Link to="/cart" className="relative text-slate-600 p-2" title="Cart" aria-label="Cart">
                <ShoppingCart size={22} />
                {itemsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {itemsCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-primary-600 focus:outline-none"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-2 pb-4 space-y-3 shadow-md">
          {(!user || user.role === 'student') && (
            <form onSubmit={handleSearchSubmit} className="relative w-full my-2">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-2.5 text-slate-400" aria-label="Submit Search">
                <Search size={18} />
              </button>
            </form>
          )}

          <div className="flex flex-col space-y-2 pt-2">
            {(!user || user.role === 'student') && (
              <>
                <Link
                  to="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                >
                  Shop
                </Link>
                <Link
                  to="/custom-request"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                >
                  Custom Request
                </Link>
                {user && (
                  <>
                    <Link
                      to="/wishlist"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600 flex items-center justify-between"
                    >
                      <span>Wishlist</span>
                      <Heart size={18} className="text-red-500 fill-current" />
                    </Link>
                    <Link
                      to="/myorders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                    >
                      My Orders
                    </Link>
                  </>
                )}
              </>
            )}

            {user && user.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600 flex items-center"
              >
                <LayoutDashboard size={18} className="mr-2" />
                Admin Panel
              </Link>
            )}

            {user && user.role === 'delivery' && (
              <Link
                to="/delivery/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600 flex items-center"
              >
                <ClipboardList size={18} className="mr-2" />
                Delivery Dashboard
              </Link>
            )}

            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600 flex items-center"
                >
                  <User size={18} className="mr-2" />
                  My Profile
                </Link>
                <button
                  onClick={handleLogoutClick}
                  className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 flex items-center"
                >
                  <LogOut size={18} className="mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-2 pt-2 border-t border-slate-100">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-3 min-h-[48px] text-base font-semibold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 shadow-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center btn-primary py-3.5 min-h-[48px] text-base flex items-center justify-center"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
