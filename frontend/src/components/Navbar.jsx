import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, Heart, User, LogOut, Search, Menu, X, 
  PlusCircle, LayoutDashboard, ClipboardList, Bell, Wallet, 
  Gift, Clock, TrendingUp, Trash2, Mic, MicOff, CreditCard, 
  HelpCircle, Home as HomeIcon, MapPin, Grid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { notificationAPI, productAPI } from '../api';
import { getOptimizedImageUrl } from '../utils/image';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { itemsCount } = useCart();
  const [keyword, setKeyword] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Advanced Search Overlay States
  const [suggestions, setSuggestions] = useState({ products: [], categories: [] });
  const [trending, setTrending] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const searchRefDesktop = useRef(null);
  const searchRefMobile = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close suggestions overlay when user clicks outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        (searchRefDesktop.current && !searchRefDesktop.current.contains(event.target)) &&
        (searchRefMobile.current && !searchRefMobile.current.contains(event.target))
      ) {
        setShowOverlay(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch trending keywords and load recent searches from localstorage on overlay open
  useEffect(() => {
    if (!showOverlay) return;
    const loadRecentAndTrending = async () => {
      const recent = JSON.parse(localStorage.getItem('recentSearches')) || [];
      setRecentSearches(recent);
      try {
        const { data } = await productAPI.getTrending();
        setTrending(data);
      } catch (err) {
        console.error('Trending fetch error', err);
      }
    };
    loadRecentAndTrending();
  }, [showOverlay]);

  // Debounced search suggestions query (200ms)
  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions({ products: [], categories: [] });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await productAPI.getSuggestions(keyword);
        setSuggestions(data);
      } catch (err) {
        console.error('Suggestions error', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const { data } = await notificationAPI.getAll();
        const list = Array.isArray(data) ? data : (data?.notifications || []);
        setNotifications(list);
      } catch (error) {
        console.error('Failed to load navbar notifications:', error);
        setNotifications([]);
      }
    };
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000);
    return () => clearInterval(timer);
  }, [user]);

  const handleMarkAsRead = async (notifId) => {
    try {
      await notificationAPI.markRead(notifId);
      setNotifications(prev => {
        const list = Array.isArray(prev) ? prev : (prev?.notifications || []);
        return list.map(n => n._id === notifId ? { ...n, isRead: true } : n);
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => {
        const list = Array.isArray(prev) ? prev : (prev?.notifications || []);
        return list.map(n => ({ ...n, isRead: true }));
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const notificationList = Array.isArray(notifications) ? notifications : (notifications?.notifications || []);
  const unreadCount = notificationList.filter(n => !n.isRead).length;

  const addRecentSearch = (query) => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim().toLowerCase();
    const updated = [trimmed, ...recentSearches.filter(q => q !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const removeRecentSearch = (e, queryToDelete) => {
    e.stopPropagation();
    const updated = recentSearches.filter(q => q !== queryToDelete);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (keyword.trim()) {
      addRecentSearch(keyword);
      setShowOverlay(false);
      navigate(`/products?keyword=${encodeURIComponent(keyword)}`);
    } else {
      navigate('/products');
    }
  };

  const handleSuggestionClick = (query, type, targetId) => {
    addRecentSearch(query);
    setShowOverlay(false);
    setKeyword(query);
    if (type === 'category') {
      navigate(`/products?category=${encodeURIComponent(query)}`);
    } else if (type === 'product' && targetId) {
      navigate(`/products/${targetId}`);
    } else {
      navigate(`/products?keyword=${encodeURIComponent(query)}`);
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Try Google Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setKeyword(speechToText);
      addRecentSearch(speechToText);
      setShowOverlay(false);
      navigate(`/products?keyword=${encodeURIComponent(speechToText)}`);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-emerald-100 text-emerald-950 font-extrabold px-0.5 rounded">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const handleLogoutClick = () => {
    logout();
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Banner alert on Delivery SLA */}
      <div className="bg-primary-600 text-white text-[10px] sm:text-xs font-black py-1.5 px-4 text-center select-none tracking-wide uppercase">
        ⚡ Superfast direct-to-room delivery. Free delivery on orders above ₹199!
      </div>

      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 shadow-premium-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-4">
            
            {/* Logo and Campus delivery pointer */}
            <div className="flex items-center gap-6 shrink-0">
              <Link to={user ? (user.role === 'admin' ? '/admin/dashboard' : user.role === 'delivery' ? '/delivery/dashboard' : '/') : '/'} className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-primary-600 tracking-tight flex items-center font-display">
                  Hostel<span className="text-slate-900">Kart</span>
                </span>
              </Link>
              
              {/* Location Pin */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-bold border-l border-slate-200 pl-6 select-none">
                <MapPin className="text-primary-600 w-4 h-4 shrink-0 animate-pulse" />
                <div className="leading-tight">
                  <span className="block text-slate-800 font-extrabold">Delivery to Room</span>
                  <span className="text-[10px] text-slate-400">IIT Hostel Corridors</span>
                </div>
              </div>
            </div>

            {/* Desktop Search bar */}
            {(!user || user.role === 'student') && (
              <form onSubmit={handleSearchSubmit} ref={searchRefDesktop} className="hidden md:flex flex-1 max-w-lg relative">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search fresh apples, study supplies, chips, stationery..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-11 pr-16 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-xs font-bold text-slate-700 transition-all placeholder-slate-400"
                    value={keyword}
                    onFocus={() => setShowOverlay(true)}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  
                  {/* Speech input */}
                  <button
                    type="button"
                    onClick={startVoiceSearch}
                    className={`absolute right-9 top-1.5 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary-600 transition-colors ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                    title="Search by voice"
                    aria-label="Voice Search"
                  >
                    <Mic size={14} />
                  </button>

                  <button type="submit" className="absolute right-2 top-1.5 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary-600" aria-label="Submit Search">
                    <Search size={14} />
                  </button>
                </div>

                {/* Suggestions Overlay */}
                {showOverlay && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden max-h-[380px] overflow-y-auto p-4 space-y-4 animate-slide-down">
                    {!keyword.trim() ? (
                      <>
                        {recentSearches.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              <span>Recent Queries</span>
                              <button 
                                type="button" 
                                onClick={clearAllRecentSearches}
                                className="text-[10px] text-red-500 hover:underline capitalize font-bold"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {recentSearches.map((term, i) => (
                                <span 
                                  key={i}
                                  onClick={() => handleSuggestionClick(term, 'keyword')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-xl cursor-pointer transition-colors border border-slate-100"
                                >
                                  <Clock size={11} className="text-slate-400" />
                                  <span>{term}</span>
                                  <button 
                                    type="button"
                                    onClick={(e) => removeRecentSearch(e, term)}
                                    className="w-4 h-4 rounded-full hover:bg-slate-200 flex items-center justify-center text-[10px] text-slate-450"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp size={11} className="text-primary-600 animate-bounce" />
                            <span>Popular Queries</span>
                          </div>
                          {trending.length === 0 ? (
                            <p className="text-xs text-slate-400 italic font-semibold">No trending searches yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {trending.map((item, i) => (
                                <span 
                                  key={i}
                                  onClick={() => handleSuggestionClick(item.keyword, 'keyword')}
                                  className="px-3 py-1.5 bg-primary-50/45 hover:bg-primary-50 text-xs font-bold text-primary-700 rounded-xl cursor-pointer transition-colors border border-primary-100/30"
                                >
                                  {item.keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        {suggestions.categories?.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Matched Categories</div>
                            <div className="grid grid-cols-2 gap-2">
                              {suggestions.categories.map((cat, i) => (
                                <div 
                                  key={i}
                                  onClick={() => handleSuggestionClick(cat.name, 'category')}
                                  className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl cursor-pointer transition-colors"
                                >
                                  <img src={getOptimizedImageUrl(cat.image, 32)} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" />
                                  <span className="text-xs font-bold text-slate-700">{highlightMatch(cat.name, keyword)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Matched Products</div>
                          {suggestions.products?.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">No matching products found.</p>
                          ) : (
                            <div className="divide-y divide-slate-50">
                              {suggestions.products.map((prod, i) => {
                                const discountedPrice = Math.round(prod.price * (1 - (prod.discount || 0)/100));
                                return (
                                  <div 
                                    key={i}
                                    onClick={() => handleSuggestionClick(prod.name, 'product', prod._id)}
                                    className="flex items-center justify-between py-2 hover:bg-slate-50/50 cursor-pointer transition-colors rounded-xl px-2"
                                  >
                                    <div className="flex items-center gap-3">
                                      <img src={getOptimizedImageUrl(prod.image, 40)} alt={prod.name} className="w-9 h-9 rounded-lg object-cover border border-slate-100" />
                                      <div>
                                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{highlightMatch(prod.name, keyword)}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{prod.category}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-extrabold text-slate-800">₹{discountedPrice}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-5">
              {(!user || user.role === 'student') && (
                <>
                  <Link to="/products" className="text-xs font-extrabold uppercase tracking-wider text-slate-600 hover:text-primary-600 transition-colors">
                    Shop
                  </Link>
                  <Link to="/custom-request" className="text-xs font-extrabold uppercase tracking-wider text-slate-600 hover:text-primary-600 transition-colors">
                    Custom Request
                  </Link>
                  {user && (
                    <>
                      <Link to="/wishlist" className="relative text-slate-600 hover:text-primary-600 transition-colors p-1" title="Wishlist" aria-label="Wishlist">
                        <Heart size={18} />
                      </Link>
                      <Link to="/myorders" className="text-xs font-extrabold uppercase tracking-wider text-slate-600 hover:text-primary-600 transition-colors">
                        My Orders
                      </Link>
                    </>
                  )}
                  <Link to="/cart" className="relative text-slate-650 hover:text-primary-600 transition-all p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-1.5 shadow-sm hover:shadow-md" title="Cart" aria-label="Cart">
                    <ShoppingCart size={16} />
                    <span className="text-xs font-black">₹{itemsCount > 0 ? `${itemsCount} items` : '0.00'}</span>
                    {itemsCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary-600 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white">
                        {itemsCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {user && user.role === 'admin' && (
                <Link to="/admin/dashboard" className="flex items-center space-x-1 text-xs font-extrabold uppercase tracking-wider text-slate-600 hover:text-primary-600 transition-colors">
                  <LayoutDashboard size={16} />
                  <span>Admin Panel</span>
                </Link>
              )}

              {user && user.role === 'delivery' && (
                <Link to="/delivery/dashboard" className="flex items-center space-x-1 text-xs font-extrabold uppercase tracking-wider text-slate-600 hover:text-primary-600 transition-colors">
                  <ClipboardList size={16} />
                  <span>Delivery Dashboard</span>
                </Link>
              )}

              {/* Notifications Center */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative text-slate-600 hover:text-primary-600 transition-colors p-2 focus:outline-none flex items-center justify-center"
                    title="Notifications"
                    aria-label="Notifications"
                    aria-haspopup="true"
                    aria-expanded={notificationsOpen}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-rose-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white animate-bounce">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-slide-down max-h-96 overflow-y-auto">
                      <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Notifications ({unreadCount} new)</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[10px] font-bold text-primary-600 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {notificationList.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic text-center py-6 font-bold">No notifications yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {notificationList.map((notif) => (
                            <div
                              key={notif._id}
                              onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                              className={`p-3 text-xs leading-normal transition-colors cursor-pointer hover:bg-slate-50 ${
                                !notif.isRead ? 'bg-primary-50/20 font-bold' : 'text-slate-500'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-bold text-slate-800">{notif.title}</span>
                                {!notif.isRead && (
                                  <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0 mt-1"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{notif.message}</p>
                              <span className="text-[8px] text-slate-400 block mt-1">
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

              {/* Profile Dropdown Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-primary-600 focus:outline-none py-2"
                    aria-label="User profile menu"
                    aria-haspopup="true"
                    aria-expanded={profileDropdownOpen}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-black border border-primary-200">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden lg:inline-flex items-center gap-1">
                      <span>{user.name.split(' ')[0]}</span>
                      {user.role === 'student' && user.loyaltyLevel && (
                        <span className="text-[8px] font-black tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0 shadow-sm leading-none">
                          {user.loyaltyLevel}
                        </span>
                      )}
                    </span>
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-lg py-1.5 z-50 animate-slide-down">
                      <div className="px-4 py-2 border-b border-slate-150">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Account</p>
                        <p className="text-xs font-bold text-slate-750 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase rounded bg-primary-50 text-primary-700">
                          {user.role}
                        </span>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                      >
                        <User size={14} className="mr-2" />
                        My Profile
                      </Link>

                      {user.role === 'student' && (
                        <>
                          <Link
                            to="/wallet"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                          >
                            <Wallet size={14} className="mr-2" />
                            My Wallet
                          </Link>
                          <Link
                            to="/referrals"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                          >
                            <Gift size={14} className="mr-2" />
                            Refer & Earn
                          </Link>
                          <Link
                            to="/payment-history"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                          >
                            <CreditCard size={14} className="mr-2" />
                            Payment History
                          </Link>
                          <Link
                            to="/support"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                          >
                            <HelpCircle size={14} className="mr-2" />
                            Support Desk
                          </Link>
                        </>
                      )}

                      <button
                        onClick={handleLogoutClick}
                        className="flex items-center w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border-t border-slate-50 mt-1"
                      >
                        <LogOut size={14} className="mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 hover:text-primary-600 transition-colors">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary py-2 px-4 text-xs font-bold min-h-0 rounded-xl">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Header buttons */}
            <div className="flex md:hidden items-center space-x-2">
              {!user && (
                <Link to="/login" className="text-xs font-black text-slate-750 px-3 py-1.5 border border-slate-200 rounded-xl shrink-0">
                  Sign In
                </Link>
              )}
              {user && (
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative text-slate-600 p-2"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-rose-600 text-white text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Mobile search bar (always sticky under mobile header) */}
        {(!user || user.role === 'student') && (
          <div className="md:hidden px-4 pb-3 relative" ref={searchRefMobile}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                placeholder="Search essentials, fruits, stationery..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-4 pr-16 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-bold text-slate-700"
                value={keyword}
                onFocus={() => setShowOverlay(true)}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`absolute right-9 top-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 ${isListening ? 'text-red-500 animate-pulse' : ''}`}
              >
                <Mic size={14} />
              </button>
              <button type="submit" className="absolute right-2 top-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-450">
                <Search size={14} />
              </button>
            </form>

            {/* suggestions overlays for mobile */}
            {showOverlay && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[300px] overflow-y-auto p-4 space-y-4">
                {!keyword.trim() ? (
                  <>
                    {recentSearches.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          <span>Recent</span>
                          <button 
                            type="button" 
                            onClick={clearAllRecentSearches}
                            className="text-[9px] text-red-500 hover:underline capitalize"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((term, i) => (
                            <span 
                              key={i}
                              onClick={() => handleSuggestionClick(term, 'keyword')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-650 rounded-xl cursor-pointer border border-slate-100"
                            >
                              <Clock size={11} className="text-slate-400" />
                              <span>{term}</span>
                              <button 
                                type="button"
                                onClick={(e) => removeRecentSearch(e, term)}
                                className="w-3.5 h-3.5 rounded-full hover:bg-slate-200 flex items-center justify-center text-[9px] text-slate-450"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp size={11} className="text-primary-600 animate-bounce" />
                        <span>Trending Searches</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {trending.slice(0, 4).map((item, i) => (
                          <span 
                            key={i}
                            onClick={() => handleSuggestionClick(item.keyword, 'keyword')}
                            className="px-2.5 py-1 bg-primary-50/40 hover:bg-primary-50 text-xs font-bold text-primary-750 rounded-lg border border-primary-50"
                          >
                            {item.keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {suggestions.categories?.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Categories</div>
                        <div className="grid grid-cols-1 gap-2">
                          {suggestions.categories.map((cat, i) => (
                            <div 
                              key={i}
                              onClick={() => handleSuggestionClick(cat.name, 'category')}
                              className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl cursor-pointer"
                            >
                              <img src={getOptimizedImageUrl(cat.image, 32)} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" />
                              <span className="text-xs font-bold text-slate-700 text-left">{highlightMatch(cat.name, keyword)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-455 uppercase tracking-wider">Matched Products</div>
                      {suggestions.products?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No matching products found.</p>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {suggestions.products.map((prod, i) => (
                            <div 
                              key={i}
                              onClick={() => handleSuggestionClick(prod.name, 'product', prod._id)}
                              className="flex items-center justify-between py-2 hover:bg-slate-50/50 cursor-pointer rounded-xl px-2"
                            >
                              <div className="flex items-center gap-3">
                                <img src={getOptimizedImageUrl(prod.image, 40)} alt={prod.name} className="w-9 h-9 rounded-lg object-cover border border-slate-100" />
                                <div>
                                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{highlightMatch(prod.name, keyword)}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{prod.category}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-extrabold text-slate-800">₹{Math.round(prod.price * (1 - (prod.discount || 0)/100))}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Persistent Bottom Mobile Navigation Bar */}
      {(!user || user.role === 'student') && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center py-2 px-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] select-none">
          <Link to="/" className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${location.pathname === '/' ? 'text-primary-600 font-black' : 'text-slate-400 hover:text-primary-500'}`}>
            <HomeIcon size={18} className={location.pathname === '/' ? 'scale-105 transition-transform' : ''} />
            <span>Home</span>
          </Link>
          <Link to="/products" className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${location.pathname === '/products' ? 'text-primary-600 font-black' : 'text-slate-400 hover:text-primary-500'}`}>
            <Grid size={18} className={location.pathname === '/products' ? 'scale-105 transition-transform' : ''} />
            <span>Browse</span>
          </Link>
          <Link to="/cart" className={`flex flex-col items-center gap-0.5 text-[10px] font-bold relative ${location.pathname === '/cart' ? 'text-primary-600 font-black' : 'text-slate-400 hover:text-primary-500'}`}>
            <ShoppingCart size={18} className={location.pathname === '/cart' ? 'scale-105 transition-transform' : ''} />
            {itemsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-primary-650 text-white text-[8px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white">
                {itemsCount}
              </span>
            )}
            <span>Cart</span>
          </Link>
          <Link to="/myorders" className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${location.pathname === '/myorders' ? 'text-primary-600 font-black' : 'text-slate-400 hover:text-primary-500'}`}>
            <ClipboardList size={18} className={location.pathname === '/myorders' ? 'scale-105 transition-transform' : ''} />
            <span>Orders</span>
          </Link>
          <Link to="/profile" className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${location.pathname === '/profile' ? 'text-primary-600 font-black' : 'text-slate-400 hover:text-primary-500'}`}>
            <User size={18} className={location.pathname === '/profile' ? 'scale-105 transition-transform' : ''} />
            <span>Profile</span>
          </Link>
        </div>
      )}
    </>
  );
};

export default Navbar;
