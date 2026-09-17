import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { productAPI, recommendationAPI, aiAPI, dietAPI } from '../api';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/SkeletonLoader';
import HostelKartVideo from '../components/HostelKartVideo';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Sparkles, Clock, Home as HomeIcon, 
  ShieldCheck, ShoppingBag, TrendingUp, HelpCircle, Eye, ArrowRight,
  Zap, Flame, Percent, ChevronRight, Award, MapPin, ChevronDown, Utensils
} from 'lucide-react';
import DeliveryLocationModal from '../components/DeliveryLocationModal';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants';

const staticCategories = [
  { name: 'Fruits', emoji: '🍎', bg: 'bg-red-50 hover:bg-red-100/80 border-red-100 text-red-650' },
  { name: 'Medicines', emoji: '💊', bg: 'bg-pink-50 hover:bg-pink-100/80 border-pink-100 text-pink-650' },
  { name: 'Stationery', emoji: '📚', bg: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-100 text-indigo-650' },
  { name: 'Exotic Fruits', emoji: '🥝', bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-100 text-emerald-650' },
  { name: 'Clothes Essentials', emoji: '👕', bg: 'bg-sky-50 hover:bg-sky-100/80 border-sky-100 text-sky-650' },
];

const promoBanners = [
  {
    title: 'Mid-Sem Exam Fuel',
    subtitle: 'Late night snacks & energy drinks',
    tag: 'Starting at ₹29',
    bg: 'from-purple-900 to-indigo-950',
    emoji: '🥤'
  },
  {
    title: 'Freshness Guaranteed',
    subtitle: 'Apples, bananas & local farm dairy',
    tag: 'Daily Slots',
    bg: 'from-emerald-900 to-emerald-950',
    emoji: '🍎'
  }
];

const Home = () => {
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';
  const visibleCategories = isAdmin 
    ? staticCategories 
    : staticCategories.filter(cat => STUDENT_VISIBLE_CATEGORIES.includes(cat.name));

  const [searchTerm, setSearchTerm] = useState('');
  const [recs, setRecs] = useState({
    buyAgain: [],
    trending: [],
    recommendedForYou: [],
    studentsAlsoBought: [],
    frequentlyBoughtTogether: []
  });
  const [recsLoading, setRecsLoading] = useState(true);
  const [delayedRecsLoading, setDelayedRecsLoading] = useState(true);
  const [aiRecs, setAiRecs] = useState([]);
  const [aiRecsLoading, setAiRecsLoading] = useState(true);
  const [latestDietPlan, setLatestDietPlan] = useState(null);
  const [dietPlanLoading, setDietPlanLoading] = useState(false);
  const [recentViews, setRecentViews] = useState([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const navigate = useNavigate();

  const getLocationSummary = (u) => {
    if (u?.hostelDetails?.hostelName) {
      const { hostelName, block, roomNumber } = u.hostelDetails;
      let text = hostelName;
      if (block) text += ` • Blk ${block}`;
      if (roomNumber) text += ` • Rm ${roomNumber}`;
      return text;
    }
    try {
      const guest = localStorage.getItem('guestHostelDetails');
      if (guest) {
        const parsed = JSON.parse(guest);
        if (parsed?.hostelName) {
          let text = parsed.hostelName;
          if (parsed.block) text += ` • Blk ${parsed.block}`;
          if (parsed.roomNumber) text += ` • Rm ${parsed.roomNumber}`;
          return text;
        }
      }
    } catch {}
    return 'Select Location';
  };

  // Load recently viewed products
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hostelkart_recent_views');
      if (saved) {
        setRecentViews(JSON.parse(saved).slice(0, 5));
      }
    } catch (e) {
      console.warn('Failed to load recent views:', e);
    }
  }, []);

  // Fetch recommendations
  useEffect(() => {
    let active = true;
    
    const fetchRecommendations = async () => {
      setRecsLoading(true);
      setDelayedRecsLoading(true);
      setAiRecsLoading(true);
      try {
        const { data } = await recommendationAPI.get();
        if (!active) return;
        
        setRecs(prev => ({
          ...prev,
          buyAgain: data.buyAgain || [],
          trending: data.trending || []
        }));
        setRecsLoading(false);

        const belowFoldTimer = setTimeout(() => {
          if (!active) return;
          setRecs(prev => ({
            ...prev,
            recommendedForYou: data.recommendedForYou || [],
            studentsAlsoBought: data.studentsAlsoBought || [],
            frequentlyBoughtTogether: data.frequentlyBoughtTogether || []
          }));
          setDelayedRecsLoading(false);
        }, 200);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
        if (active) {
          setRecsLoading(false);
          setDelayedRecsLoading(false);
        }
      }

      try {
        const { data } = await aiAPI.getRecommendations();
        if (active && data?.success) {
          setAiRecs(data.recommendations || []);
        }
      } catch (err) {
        console.error('Failed to fetch AI recommendations:', err);
      } finally {
        if (active) setAiRecsLoading(false);
      }
    };

    fetchRecommendations();
    
    return () => {
      active = false;
    };
  }, [user]);

  // Fetch latest diet plan for quick-access hero banner
  useEffect(() => {
    let active = true;
    if (!user) {
      setLatestDietPlan(null);
      return;
    }

    const loadUserDietPlan = async () => {
      setDietPlanLoading(true);
      try {
        const { data } = await dietAPI.getAll();
        if (active && data && data.plans && data.plans.length > 0) {
          setLatestDietPlan(data.plans[0]);
        }
      } catch (err) {
        console.warn('Could not load user diet plans for homepage card:', err);
      } finally {
        if (active) setDietPlanLoading(false);
      }
    };

    loadUserDietPlan();
    return () => {
      active = false;
    };
  }, [user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // horizontal scroll helper for mobile layout
  const renderProductSection = (title, subtitle, icon, items, loading, placeholder) => {
    if (!loading && (!items || items.length === 0)) {
      return placeholder ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
          <div className="flex justify-between items-baseline select-none">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                {icon}
                <span>{title}</span>
              </h2>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">{subtitle}</p>
            </div>
          </div>
          <div className="text-center py-8 bg-white rounded-3xl border border-slate-100 select-none">
            <p className="text-slate-450 text-xs font-bold">{placeholder}</p>
          </div>
        </section>
      ) : null;
    }

    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
        <div className="flex justify-between items-baseline select-none">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              {icon}
              <span>{title}</span>
            </h2>
            <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">{subtitle}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex sm:grid sm:grid-cols-5 overflow-x-auto sm:overflow-visible gap-4 pb-4 sm:pb-0 scrollbar-none snap-x snap-mandatory">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="min-w-[170px] sm:min-w-0 snap-align-start shrink-0">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex sm:grid sm:grid-cols-5 overflow-x-auto sm:overflow-visible gap-4 pb-4 sm:pb-0 scrollbar-none snap-x snap-mandatory animate-fade-in" style={{ scrollbarWidth: 'none' }}>
            {items.filter(p => p && p._id).slice(0, 8).map((product) => (
              <div key={product._id} className="min-w-[170px] sm:min-w-0 snap-align-start shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderAIProductSection = (title, subtitle, icon, items, loading, placeholder) => {
    if (!loading && (!items || items.length === 0)) {
      return placeholder ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
          <div className="flex justify-between items-baseline select-none">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                {icon}
                <span>{title}</span>
              </h2>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">{subtitle}</p>
            </div>
          </div>
          <div className="text-center py-8 bg-white rounded-3xl border border-slate-100 select-none">
            <p className="text-slate-450 text-xs font-bold">{placeholder}</p>
          </div>
        </section>
      ) : null;
    }

    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
        <div className="flex justify-between items-baseline select-none">
          <div>
            <h2 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {icon}
              <span>{title}</span>
            </h2>
            <p className="text-[10px] text-emerald-600 font-extrabold uppercase mt-0.5 flex items-center gap-1">
              <span>{subtitle}</span>
              <span className="bg-emerald-100 text-emerald-750 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-200">Powered by Gemini AI</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex sm:grid sm:grid-cols-4 overflow-x-auto sm:overflow-visible gap-4 pb-4 sm:pb-0 scrollbar-none snap-x snap-mandatory">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="min-w-[200px] sm:min-w-0 snap-align-start shrink-0">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex sm:grid sm:grid-cols-4 overflow-x-auto sm:overflow-visible gap-4 pb-4 sm:pb-0 scrollbar-none snap-x snap-mandatory animate-fade-in" style={{ scrollbarWidth: 'none' }}>
            {items.slice(0, 4).map((item) => (
              <div key={item.product._id} className="min-w-[200px] sm:min-w-0 snap-align-start shrink-0">
                <ProductCard product={item.product} reason={item.reason} />
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-24 bg-slate-50/15">
      <SEO 
        title="Hostel essentials delivered to your door floor in minutes"
        description="HostelKart delivers fresh fruits, vegetables, study stationery, snacks, and room hygiene products directly to your hostel room floor."
      />
      
      {/* Mobile Sticky Search Bar Header */}
      <div className="sticky top-0 z-45 bg-emerald-600 text-white px-4 py-3 shadow-md md:hidden flex flex-col gap-2">
        <div 
          onClick={() => setIsLocationModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsLocationModalOpen(true); }}
          className="flex items-center gap-2 select-none cursor-pointer active:opacity-80 transition-opacity"
          aria-label="Change delivery location"
        >
          <div className="bg-white/10 p-1.5 rounded-full">
            <MapPin className="w-4 h-4 text-emerald-100" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">{getGreeting()}, {user?.name || 'Student'}</div>
            <div className="text-xs font-black truncate max-w-[250px] flex items-center gap-1">
              <span>{getLocationSummary(user)}</span>
              <ChevronDown size={12} className="text-emerald-200 shrink-0" />
            </div>
          </div>
        </div>
        <form onSubmit={handleSearchSubmit} className="relative mt-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder='Search "medicines", "fruits" or "snacks"...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-none pl-10 pr-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-emerald-300 outline-none transition-all shadow-sm"
          />
        </form>
      </div>

      {/* Desktop Welcome Hero / Title Banner */}
      <div className="hidden md:block max-w-7xl mx-auto px-8 pt-8">
        <div className="bg-emerald-50 border border-emerald-100/50 rounded-3xl p-6 flex justify-between items-center shadow-premium-sm">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-800 leading-tight">
              {getGreeting()}, {user?.name || 'Hostelite'}! 👋
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase">
              HostelKart delivers daily essentials straight to your door.
            </p>
          </div>
          <form onSubmit={handleSearchSubmit} className="relative w-80">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products, brands and items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-2xl text-xs font-bold text-slate-700 focus:ring-1 focus:ring-primary-500 outline-none transition-all shadow-sm"
            />
          </form>
        </div>
      </div>
      
      {/* 1. Header Promo Banners - horizontal scroll snap on mobile, 3-column grid on desktop */}
      <section className="px-4 sm:px-8">
        <div 
          className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible pb-3 md:pb-0 snap-x snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {promoBanners.map((banner, idx) => (
            <div 
              key={idx}
              className={`relative overflow-hidden bg-gradient-to-br ${banner.bg} text-white rounded-3xl p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 select-none flex flex-col justify-between min-h-[140px] border border-white/5 min-w-[280px] sm:min-w-0 snap-align-start shrink-0`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
              <div className="space-y-1">
                <span className="inline-block px-2 py-0.5 bg-white/10 backdrop-blur-md rounded-md text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  {banner.tag}
                </span>
                <h3 className="text-lg font-black leading-tight tracking-tight mt-1.5">{banner.title}</h3>
                <p className="text-xs text-slate-350 font-bold">{banner.subtitle}</p>
              </div>
              <div className="flex justify-between items-center pt-4">
                <span className="text-xs font-black underline hover:text-emerald-300 cursor-pointer flex items-center gap-0.5" onClick={() => navigate('/products')}>
                  Shop Now <ChevronRight size={12} />
                </span>
                <span className="text-3xl filter drop-shadow-sm">{banner.emoji}</span>
              </div>
            </div>
          ))}

          {/* 3rd Item in Grid: My Diet Plan Card */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 text-white rounded-3xl p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 select-none flex flex-col justify-between min-h-[140px] border border-emerald-500/20 min-w-[280px] sm:min-w-0 snap-align-start shrink-0"
          >
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md rounded-md text-[9px] font-black uppercase tracking-wider text-emerald-300">
                <Sparkles size={10} className="text-emerald-300" />
                {latestDietPlan ? `Plan: ${latestDietPlan.profile?.goal || 'Active Plan'}` : 'AI Nutrition Co-Pilot'}
              </span>
              <h3 className="text-lg font-black leading-tight tracking-tight mt-1.5 flex items-center gap-1.5">
                <span>My Diet Plan</span>
              </h3>
              {latestDietPlan ? (
                <p className="text-xs text-emerald-100/90 font-medium line-clamp-2">
                  <span className="font-extrabold text-white">
                    {latestDietPlan.plan?.planSummary?.targetCalories || latestDietPlan.plan?.estimatedDailyCalories?.totalCalories || 2200} kcal
                  </span>
                  {' • '}
                  <span>P: {latestDietPlan.plan?.estimatedDailyMacros?.protein || latestDietPlan.plan?.planSummary?.estimatedMacros?.protein || '120g'}</span>
                  {' • '}
                  <span>C: {latestDietPlan.plan?.estimatedDailyMacros?.carbs || latestDietPlan.plan?.planSummary?.estimatedMacros?.carbs || '240g'}</span>
                  {' • '}
                  <span>F: {latestDietPlan.plan?.estimatedDailyMacros?.fats || latestDietPlan.plan?.planSummary?.estimatedMacros?.fats || '60g'}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-350 font-bold">
                  Personalized hostel mess & fitness nutrition
                </p>
              )}
            </div>
            <div className="flex justify-between items-center pt-4">
              <Link 
                to="/diet-planner"
                className="text-xs font-black text-emerald-300 hover:text-emerald-200 underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{latestDietPlan ? 'View My Diet Plan' : 'Create Diet Plan'}</span>
                <ChevronRight size={12} />
              </Link>
              <span className="text-3xl filter drop-shadow-sm">🥗</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Browse Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
        <div className="flex items-baseline justify-between select-none">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🛒</span> Browse Categories
            </h2>
            <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Explore curated campus essentials</p>
          </div>
          <Link to="/products" className="text-[10px] font-extrabold text-primary-650 hover:underline uppercase tracking-wide flex items-center gap-0.5">
            <span>View All</span>
            <ChevronRight size={10} />
          </Link>
        </div>

        {/* 5 Canonical Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {visibleCategories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className={`p-3.5 bg-white border ${cat.bg} border-slate-100/50 rounded-2.5xl hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 text-center flex flex-col items-center justify-between shadow-premium-sm group`}
            >
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-150 flex items-center justify-center text-xl shadow-inner transition-transform duration-300 group-hover:scale-105">
                {cat.emoji}
              </div>
              <span className="text-xs font-black text-slate-700 block truncate w-full mt-2">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. See HostelKart in Action Video Section */}
      <HostelKartVideo />

      {/* 4. Flash Deals Horizontal List */}
      {renderProductSection(
        "Flash Deals",
        "Top price-drop items flying off shelves",
        <Zap className="w-4 h-4 text-amber-500 animate-pulse fill-amber-500" />,
        recs.trending,
        recsLoading,
        "No active promotional deals right now."
      )}

      {/* 4. Buy It Again List */}
      {user && (recsLoading || recs.buyAgain?.length > 0) && renderProductSection(
        "Buy It Again",
        "Quick purchase your favorites",
        <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />,
        recs.buyAgain,
        recsLoading
      )}

      {/* 5. Recently Viewed List */}
      {recentViews.length > 0 && renderProductSection(
        "Recently Viewed Items",
        "Pick up right where you left off",
        <Eye className="w-4 h-4 text-primary-500" />,
        recentViews,
        false
      )}

      {/* 6. Recommended For You List */}
      {renderProductSection(
        "Recommended For You",
        "Curated recommendations for your dorm desk",
        <Sparkles className="w-4 h-4 text-purple-500 animate-bounce fill-purple-500" />,
        recs.recommendedForYou,
        delayedRecsLoading,
        "Sign in to trigger personalized recommendations."
      )}

      {/* Gemini AI smart recommendations */}
      {(!user || user.role === 'student') && renderAIProductSection(
        "Gemini AI Smart Picks",
        "Dorm recommendations based on your preferences",
        <Sparkles className="w-4.5 h-4.5 text-emerald-500 animate-pulse fill-emerald-500" />,
        aiRecs,
        aiRecsLoading,
        "Start browsing to generate personalized Gemini suggestions."
      )}

      {/* 7. Popular in Hostel List */}
      {renderProductSection(
        "Popular in Your Hostel",
        "Commonly ordered campus products",
        <HomeIcon className="w-4 h-4 text-indigo-500 fill-indigo-500" />,
        recs.studentsAlsoBought,
        delayedRecsLoading,
        "No trending popular purchases logged."
      )}

      {/* 8. Frequently Bought Together List */}
      {renderProductSection(
        "Frequently Bought Together",
        "Common product pack combinations",
        <Award className="w-4 h-4 text-emerald-500 animate-pulse fill-emerald-500" />,
        recs.frequentlyBoughtTogether,
        delayedRecsLoading,
        "No combo pairs matched right now."
      )}

      {/* Delivery Location Selector Modal */}
      <DeliveryLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};

export default Home;