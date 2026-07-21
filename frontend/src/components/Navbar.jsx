import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, User, LogOut, Search, Menu, X, PlusCircle, LayoutDashboard, ClipboardList, Bell, Wallet, Gift, Clock, TrendingUp, Trash2, Mic, MicOff, CreditCard, HelpCircle } from 'lucide-react';
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
  
  const navigate = useNavigate();
  const location = useLocation();

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

  // Web Speech API Voice Search integration
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

  // Helper to render matching keywords highlighted in search suggestions
  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-100 text-amber-950 font-bold px-0.5 rounded">{part}</mark>
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
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to={user ? (user.role === 'admin' ? '/admin/dashboard' : user.role === 'delivery' ? '/delivery/dashboard' : '/') : '/'} className="flex items-center space-x-2">
              <span className="text-2xl font-extrabold text-primary-600 tracking-tight font-sans">
                Hostel<span className="text-slate-800">Kart</span>
              </span>
            </Link>
          </div>

          {/* Search bar (Desktop) - only visible for student/public */}
          {(!user || user.role === 'student') && (
            <form onSubmit={handleSearchSubmit} ref={searchRefDesktop} className="hidden md:flex flex-1 max-w-md mx-8 relative">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search hostel essentials, fruits, stationery..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-16 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-sm transition-all"
                  value={keyword}
                  onFocus={() => setShowOverlay(true)}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                
                {/* Voice Search Button */}
                <button
                  type="button"
                  onClick={startVoiceSearch}
                  className={`absolute right-9 top-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary-600 transition-colors ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                  title="Search by voice"
                  aria-label="Voice Search"
                >
                  <Mic size={16} />
                </button>

                <button type="submit" className="absolute right-2 top-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary-600" aria-label="Submit Search">
                  <Search size={18} />
                </button>
              </div>

              {/* Advanced Suggestions Dropdown Overlay */}
              {showOverlay && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto p-4 space-y-4">
                  {/* Keyword is empty: show Recent and Trending */}
                  {!keyword.trim() ? (
                    <>
                      {recentSearches.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-450 uppercase tracking-wider">
                            <span>Recent Searches</span>
                            <button 
                              type="button" 
                              onClick={clearAllRecentSearches}
                              className="text-[10px] text-red-500 hover:underline capitalize"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recentSearches.map((term, i) => (
                              <span 
                                key={i}
                                onClick={() => handleSuggestionClick(term, 'keyword')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-650 rounded-xl cursor-pointer transition-colors border border-slate-100"
                              >
                                <Clock size={12} className="text-slate-400" />
                                <span>{term}</span>
                                <button 
                                  type="button"
                                  onClick={(e) => removeRecentSearch(e, term)}
                                  className="w-4 h-4 rounded-full hover:bg-slate-200 flex items-center justify-center text-[10px] text-slate-450 hover:text-slate-700"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp size={13} className="text-primary-600" />
                          <span>Trending Searches</span>
                        </div>
                        {trending.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No trending searches yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {trending.map((item, i) => (
                              <span 
                                key={i}
                                onClick={() => handleSuggestionClick(item.keyword, 'keyword')}
                                className="px-3 py-1.5 bg-primary-50/40 hover:bg-primary-50 text-xs font-semibold text-primary-750 rounded-xl cursor-pointer transition-colors border border-primary-50"
                              >
                                {item.keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Keyword is NOT empty: show suggestions (categories and products) */
                    <div className="space-y-4">
                      {/* Categories */}
                      {suggestions.categories?.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-slate-450 uppercase tracking-wider">Matched Categories</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {suggestions.categories.map((cat, i) => (
                              <div 
                                key={i}
                                onClick={() => handleSuggestionClick(cat.name, 'category')}
                                className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl cursor-pointer transition-colors"
                              >
                                <img src={getOptimizedImageUrl(cat.image, 32)} alt={cat.name} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 rounded-lg object-cover" />
                                <span className="text-xs font-bold text-slate-700">{highlightMatch(cat.name, keyword)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Products */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-450 uppercase tracking-wider">Matched Products</div>
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
                                  className="flex items-center justify-between py-2 hover:bg-slate-50/50 cursor-pointer transition-colors rounded-lg px-2 -mx-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <img src={getOptimizedImageUrl(prod.image, 40)} alt={prod.name} width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                                    <div>
                                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{highlightMatch(prod.name, keyword)}</p>
                                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{prod.category}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-extrabold text-slate-800">₹{discountedPrice}</span>
                                    {prod.discount > 0 && (
                                      <span className="text-[9px] text-red-500 font-bold block line-through font-medium">₹{prod.price}</span>
                                    )}
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

          {/* Navigation Links & Buttons (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
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

                    {notificationList.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-6">No notifications yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notificationList.map((notif) => (
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
                  <span className="hidden lg:inline-flex items-center gap-1">
                    <span>{user.name.split(' ')[0]}</span>
                    {user.role === 'student' && user.loyaltyLevel && (
                      <span className="text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0 shadow-sm leading-none">
                        {user.loyaltyLevel}
                      </span>
                    )}
                  </span>
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
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                    >
                      <User size={16} className="mr-2" />
                      My Profile
                    </Link>

                    {user.role === 'student' && (
                      <>
                        <Link
                          to="/wallet"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                        >
                          <Wallet size={16} className="mr-2" />
                          My Wallet
                        </Link>
                        <Link
                          to="/referrals"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                        >
                          <Gift size={16} className="mr-2" />
                          Refer & Earn
                        </Link>
                        <Link
                          to="/payment-history"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                        >
                          <CreditCard size={16} className="mr-2" />
                          Payment History
                        </Link>
                        <Link
                          to="/support"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                        >
                          <HelpCircle size={16} className="mr-2" />
                          Support Desk
                        </Link>
                      </>
                    )}

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

          {/* Mobile menu button & quick auth buttons */}
          <div className="flex md:hidden items-center space-x-2">
            {!user ? (
              <div className="flex items-center space-x-1.5">
                <Link to="/login" className="text-xs font-bold text-slate-700 hover:text-primary-600 px-2 py-1.5 border border-slate-200 rounded-lg shrink-0">
                  Sign In
                </Link>
                <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition-all shrink-0">
                  Sign Up
                </Link>
              </div>
            ) : null}

            {(!user || user.role === 'student') && (
              <Link to="/cart" className="relative text-slate-600 p-1.5 flex items-center justify-center shrink-0" title="Cart" aria-label="Cart">
                <ShoppingCart size={20} />
                {itemsCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {itemsCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-primary-600 focus:outline-none p-1.5 shrink-0"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Search Bar */}
      {(!user || user.role === 'student') && (
        <div className="md:hidden px-4 pb-3 relative" ref={searchRefMobile}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Search essentials, snacks, beverages..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-16 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs transition-all"
              value={keyword}
              onFocus={() => setShowOverlay(true)}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {/* Voice Search Button */}
            <button
              type="button"
              onClick={startVoiceSearch}
              className={`absolute right-9 top-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary-600 transition-colors ${isListening ? 'text-red-500 animate-pulse' : ''}`}
              title="Search by voice"
              aria-label="Voice Search"
            >
              <Mic size={14} />
            </button>
            <button type="submit" className="absolute right-2 top-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary-600" aria-label="Submit Search">
              <Search size={16} />
            </button>
          </form>

          {/* Advanced Suggestions Dropdown Overlay for Mobile */}
          {showOverlay && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[350px] overflow-y-auto p-4 space-y-4">
              {/* Keyword is empty: show Recent and Trending */}
              {!keyword.trim() ? (
                <>
                  {recentSearches.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-455 uppercase tracking-wider">
                        <span>Recent Searches</span>
                        <button 
                          type="button" 
                          onClick={clearAllRecentSearches}
                          className="text-[10px] text-red-500 hover:underline capitalize"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term, i) => (
                          <span 
                            key={i}
                            onClick={() => handleSuggestionClick(term, 'keyword')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-650 rounded-lg cursor-pointer transition-colors border border-slate-100"
                          >
                            <Clock size={11} className="text-slate-400" />
                            <span>{term}</span>
                            <button 
                              type="button"
                              onClick={(e) => removeRecentSearch(e, term)}
                              className="w-3.5 h-3.5 rounded-full hover:bg-slate-200 flex items-center justify-center text-[9px] text-slate-450 hover:text-slate-700"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-455 uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={13} className="text-primary-600" />
                      <span>Trending Searches</span>
                    </div>
                    {trending.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No trending searches yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {trending.map((item, i) => (
                          <span 
                            key={i}
                            onClick={() => handleSuggestionClick(item.keyword, 'keyword')}
                            className="px-2.5 py-1 bg-primary-50/40 hover:bg-primary-50 text-xs font-semibold text-primary-750 rounded-lg cursor-pointer transition-colors border border-primary-50"
                          >
                            {item.keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Keyword is NOT empty: show suggestions (categories and products) */
                <div className="space-y-4">
                  {/* Categories */}
                  {suggestions.categories?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-455 uppercase tracking-wider">Matched Categories</div>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestions.categories.map((cat, i) => (
                          <div 
                            key={i}
                            onClick={() => handleSuggestionClick(cat.name, 'category')}
                            className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl cursor-pointer transition-colors"
                          >
                            <img src={getOptimizedImageUrl(cat.image, 32)} alt={cat.name} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 rounded-lg object-cover" />
                            <span className="text-xs font-bold text-slate-700">{highlightMatch(cat.name, keyword)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-455 uppercase tracking-wider">Matched Products</div>
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
                              className="flex items-center justify-between py-2 hover:bg-slate-50/50 cursor-pointer transition-colors rounded-lg px-2 -mx-2"
                            >
                              <div className="flex items-center gap-3">
                                <img src={getOptimizedImageUrl(prod.image, 40)} alt={prod.name} width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                                <div>
                                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{highlightMatch(prod.name, keyword)}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{prod.category}</p>
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
        </div>
      )}

      {/* Sitewide Category Chips */}
      {(!user || user.role === 'student') && (
        <div className="bg-slate-50/90 border-t border-slate-100/60 py-2 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 text-[11px] font-bold whitespace-nowrap">
            {['Fruits', 'Snacks', 'Beverages', 'Stationery', 'Personal Care', 'Hostel Essentials'].map((cat) => (
              <Link
                key={cat}
                to={`/products?category=${encodeURIComponent(cat === 'Hostel Essentials' ? 'Instant Food' : cat)}`}
                className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm shrink-0"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      )}

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
                    <Link
                      to="/payment-history"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600 flex items-center"
                    >
                      <CreditCard size={18} className="mr-2" />
                      Payment History
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
