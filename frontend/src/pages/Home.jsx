import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { productAPI, recommendationAPI } from '../api';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Sparkles, Clock, Home as HomeIcon, 
  ShieldCheck, ShoppingBag, TrendingUp, HelpCircle, Eye, ArrowRight,
  Zap, Flame, Percent, ChevronRight, Award
} from 'lucide-react';

const staticCategories = [
  { name: 'Fruits', emoji: '🍎', bg: 'bg-red-50 hover:bg-red-100/80 border-red-100' },
  { name: 'Vegetables', emoji: '🥦', bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-100' },
  { name: 'Stationery', emoji: '📚', bg: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-100' },
  { name: 'Electronics Accessories', emoji: '🔌', bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-100' },
  { name: 'Personal Care', emoji: '🧼', bg: 'bg-teal-50 hover:bg-teal-100/80 border-teal-100' },
  { name: 'Dairy Products', emoji: '🧀', bg: 'bg-orange-50 hover:bg-orange-100/80 border-orange-100' }
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
  },
  {
    title: 'Room Desk Upgrades',
    subtitle: 'Notebooks, desk organizers & pens',
    tag: 'Buy 1 Get 1 Free',
    bg: 'from-amber-900 to-orange-950',
    emoji: '📝'
  }
];

const Home = () => {
  const { user } = useAuth();
  const [recs, setRecs] = useState({
    buyAgain: [],
    trending: [],
    recommendedForYou: [],
    studentsAlsoBought: [],
    frequentlyBoughtTogether: []
  });
  const [recsLoading, setRecsLoading] = useState(true);
  const [delayedRecsLoading, setDelayedRecsLoading] = useState(true);
  const [recentViews, setRecentViews] = useState([]);
  const navigate = useNavigate();

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
    };

    fetchRecommendations();
    
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="space-y-8 sm:space-y-12 pb-24 bg-slate-50/15">
      <SEO 
        title="Hostel essentials delivered to your door floor in minutes"
        description="HostelKart delivers fresh fruits, vegetables, study stationery, snacks, and room hygiene products directly to your hostel room floor."
      />
      
      {/* 1. Header Promo Slider */}
      <section className="px-4 sm:px-8 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {promoBanners.map((banner, idx) => (
            <div 
              key={idx}
              className={`relative overflow-hidden bg-gradient-to-br ${banner.bg} text-white rounded-3xl p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 select-none flex flex-col justify-between min-h-[140px] border border-white/5`}
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
        </div>
      </section>

      {/* 2. Browse Categories grid */}
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

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {staticCategories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className={`p-4 bg-white border ${cat.bg} border-slate-100 rounded-3xl hover:shadow-premium transition-all duration-300 text-center flex flex-col items-center space-y-3 shadow-premium-sm`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-150 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-all">
                {cat.emoji}
              </div>
              <span className="text-[11px] font-black text-slate-700 block truncate w-full">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Flash Deals Horizontal list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
        <div className="flex justify-between items-baseline select-none">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 animate-pulse fill-amber-500" />
              Flash Deals
            </h2>
            <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Top price-drop items flying off shelves</p>
          </div>
        </div>

        {recsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.trending?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {recs.trending.slice(0, 5).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 select-none">
            <p className="text-slate-450 text-xs font-bold">No active promotional deals right now.</p>
          </div>
        )}
      </section>

      {/* 4. Buy It Again list */}
      {user && (recsLoading || recs.buyAgain?.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
          <div className="flex justify-between items-baseline select-none">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
                Buy It Again
              </h2>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Quick purchase your favorites</p>
            </div>
          </div>

          {recsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {recs.buyAgain.slice(0, 5).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. Recently Viewed list */}
      {recentViews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
          <div className="flex justify-between items-baseline select-none">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary-500" />
                Recently Viewed Items
              </h2>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Pick up right where you left off</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {recentViews.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Recommended For You list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
        <div className="flex justify-between items-baseline select-none">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500 animate-bounce fill-purple-500" />
              Recommended For You
            </h2>
            <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Curated recommendations for your dorm desk</p>
          </div>
        </div>

        {delayedRecsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.recommendedForYou?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {recs.recommendedForYou.slice(0, 5).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 select-none">
            <p className="text-slate-450 text-xs font-bold">Sign in to trigger personalized recommendations.</p>
          </div>
        )}
      </section>

      {/* 7. Students Also Bought list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
        <div className="flex justify-between items-baseline select-none">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <HomeIcon className="w-4 h-4 text-indigo-500 fill-indigo-500" />
              Popular in Your Hostel
            </h2>
            <p className="text-[10px] text-slate-455 font-bold uppercase mt-0.5">Commonly ordered campus products</p>
          </div>
        </div>

        {delayedRecsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.studentsAlsoBought?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {recs.studentsAlsoBought.slice(0, 5).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 select-none">
            <p className="text-slate-455 text-xs font-bold">No trending popular purchases logged.</p>
          </div>
        )}
      </section>

      {/* 8. Frequently Bought Together list */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
        <div className="flex justify-between items-baseline select-none">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500 animate-pulse fill-emerald-55" />
              Frequently Bought Together
            </h2>
            <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Common product pack combinations</p>
          </div>
        </div>

        {delayedRecsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.frequentlyBoughtTogether?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {recs.frequentlyBoughtTogether.slice(0, 5).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 select-none">
            <p className="text-slate-455 text-xs font-bold">No combo pairs matched right now.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
