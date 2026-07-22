import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { productAPI, recommendationAPI } from '../api';
import ProductCard from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Sparkles, Clock, Home as HomeIcon, 
  ShieldCheck, ShoppingBag, TrendingUp, HelpCircle, Eye, ArrowRight
} from 'lucide-react';

const staticCategories = [
  { name: 'Fruits', emoji: '🍎' },
  { name: 'Vegetables', emoji: '🥦' },
  { name: 'Stationery', emoji: '📚' },
  { name: 'Electronics Accessories', emoji: '🔌' },
  { name: 'Personal Care', emoji: '🧼' },
  { name: 'Dairy Products', emoji: '🧀' }
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
  
  // Live Search States
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  // Recently Viewed State
  const [recentViews, setRecentViews] = useState([]);

  const navigate = useNavigate();

  // Load recently viewed products from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hostelkart_recent_views');
      if (saved) {
        setRecentViews(JSON.parse(saved).slice(0, 4));
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
        }, 300);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
        if (active) {
          setRecsLoading(false);
          setDelayedRecsLoading(false);
        }
      }
    };

    const apiTimer = setTimeout(() => {
      fetchRecommendations();
    }, 500);
    
    return () => {
      active = false;
      clearTimeout(apiTimer);
    };
  }, [user]);

  // Live Search Suggestions Query
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await productAPI.getAll({ keyword: searchKeyword.trim() });
        setSearchSuggestions(data.slice(0, 5)); // show top 5 matching items
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchKeyword]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchKeyword.trim())}`);
      setShowSuggestions(false);
    }
  };

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'HostelKart',
    'url': 'https://www.hostelkart.online/',
    'logo': 'https://www.hostelkart.online/logo512.png',
    'contactPoint': {
      '@type': 'ContactPoint',
      'email': 'supporthostelkart@gmail.com',
      'contactType': 'customer support'
    }
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'HostelKart',
    'url': 'https://www.hostelkart.online/',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': 'https://www.hostelkart.online/products?keyword={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-16 bg-slate-50/10">
      <SEO 
        title="Daily hostel essentials delivered to your room"
        description="HostelKart is your go-to hostel delivery app, delivering daily essentials, fresh fruits, vegetables, stationery, and personal care directly to your hostel room."
        schema={[orgSchema, websiteSchema]}
      />
      
      {/* Premium Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-950 to-emerald-950 text-white rounded-3xl mx-4 sm:mx-8 mt-4 px-6 py-10 sm:py-12 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-8 select-none">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-primary-500/10 blur-3xl pointer-events-none"></div>
        
        <div className="max-w-xl relative z-10 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-black tracking-wide text-emerald-300 uppercase">
              ⚡ Scheduled Delivery slots
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-black tracking-wide text-emerald-300 uppercase">
              🏢 Direct to Room Handoffs
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-none flex items-center gap-3">
              <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8" />
              </span>
              <span>HostelKart Store</span>
            </h1>
            <p className="text-base sm:text-lg bg-gradient-to-r from-emerald-300 via-primary-300 to-white bg-clip-text text-transparent font-extrabold">
              Daily essentials delivered right to your floor.
            </p>
          </div>
          <p className="text-xs sm:text-sm text-slate-350 font-bold max-w-md leading-relaxed">
            Order fresh fruits, custom study stationery, soft drinks, and toiletries directly to your university room.
          </p>

          {/* Interactive Live Search Bar */}
          <div className="relative max-w-md pt-2 select-text">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search for apples, pencils, dairy..."
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full bg-white border border-slate-200/25 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
              </div>
              <button type="submit" className="btn-primary text-xs px-5 py-2.5 rounded-2xl shadow-sm">
                Search
              </button>
            </form>

            {/* suggestions list dropdown */}
            {showSuggestions && searchKeyword.trim() && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-30 p-2 text-slate-700 space-y-1 overflow-hidden">
                <div className="flex justify-between items-center px-3 py-1.5 border-b border-slate-50">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Product Suggestions</span>
                  <button 
                    onClick={() => setShowSuggestions(false)}
                    className="text-[9px] font-black text-slate-450 hover:underline"
                  >
                    Close
                  </button>
                </div>
                {searching ? (
                  <p className="text-[10px] text-slate-400 font-bold italic p-3 text-center">Finding matches...</p>
                ) : searchSuggestions.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-bold italic p-3 text-center">No matches found.</p>
                ) : (
                  searchSuggestions.map((prod) => (
                    <Link
                      key={prod._id}
                      to={`/products/${prod._id}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <img 
                        src={prod.image || '/uploads/default-product.png'} 
                        alt={prod.name} 
                        className="w-8 h-8 object-contain shrink-0" 
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">{prod.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold block">{prod.category} • ₹{prod.price}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Brand Badge */}
        <div className="relative z-10 shrink-0 self-center md:self-auto flex items-center justify-center">
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-premium flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36 hover:scale-[1.02] transition-transform duration-300">
            <img
              src="/logo512.png"
              alt="HostelKart Brand logo"
              className="max-w-full max-h-full object-contain filter drop-shadow-md"
            />
          </div>
        </div>
      </section>

      {/* Modern Horizontal Categories Selection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 select-none">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs sm:text-sm font-black text-slate-450 uppercase tracking-wider">Browse Essentials</h2>
          <Link to="/products" className="text-[10px] font-black text-primary-600 hover:underline uppercase tracking-wide flex items-center gap-0.5">
            <span>View All</span>
            <ArrowRight size={10} />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {staticCategories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group p-4 bg-white border border-slate-100/80 rounded-2xl hover:border-primary-300 hover:shadow-premium transition-all duration-300 text-center flex flex-col items-center space-y-3 shadow-premium-sm shrink-0"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-emerald-50 text-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                {cat.emoji}
              </div>
              <span className="text-[11px] font-extrabold text-slate-700 group-hover:text-primary-700 block truncate w-full">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 1. Buy Again (Only for logged-in students with order history) */}
      {user && (recsLoading || recs.buyAgain?.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex justify-between items-baseline">
            <div className="space-y-0.5">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
                Buy It Again
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Items you ordered recently</p>
            </div>
          </div>

          {recsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recs.buyAgain.slice(0, 4).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Recently Viewed (Local Browser History) */}
      {recentViews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex justify-between items-baseline">
            <div className="space-y-0.5">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary-500" />
                Recently Viewed
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Items you checked out recently</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentViews.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Recommended For You */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary-650 animate-bounce" />
              Recommended For You
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Personalized recommendations for your room</p>
          </div>
        </div>

        {delayedRecsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.recommendedForYou?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recs.recommendedForYou.slice(0, 4).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-xs font-bold">Sign in to unlock personalized room recommendations.</p>
          </div>
        )}
      </section>

      {/* 4. Students Also Bought */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <HomeIcon className="w-4 h-4 text-emerald-650" />
              Students Also Bought
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Popular choices among student corridors</p>
          </div>
        </div>

        {delayedRecsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.studentsAlsoBought?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recs.studentsAlsoBought.slice(0, 4).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-xs font-bold">No trending items loaded yet.</p>
          </div>
        )}
      </section>

      {/* 5. Frequently Bought Together */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              Frequently Bought Together
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Common product combinations purchased in single orders</p>
          </div>
        </div>

        {delayedRecsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.frequentlyBoughtTogether?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recs.frequentlyBoughtTogether.slice(0, 4).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-xs font-bold">No matched combinations found.</p>
          </div>
        )}
      </section>

      {/* 6. Trending Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              Trending Products
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase">Hot products flying off shelves this hour</p>
          </div>
        </div>

        {recsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.trending?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recs.trending.slice(0, 4).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-xs font-bold">No trending products found.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
