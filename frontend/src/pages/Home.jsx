import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI, orderAPI, recommendationAPI } from '../api';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Sparkles, 
  Clock, 
  Home as HomeIcon, 
  ShieldCheck 
} from 'lucide-react';

const staticCategories = [
  { name: 'Fruits', emoji: '🍎' },
  { name: 'Vegetables', emoji: '🥦' },
  { name: 'Stationery', emoji: '📚' },
  { name: 'Instant Food', emoji: '🍜' },
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
  const [searchKeyword, setSearchKeyword] = useState('');
  const navigate = useNavigate();

  // Fetch recommendations after initial mount to prioritize static content rendering
  useEffect(() => {
    let active = true;
    
    const fetchRecommendations = async () => {
      setRecsLoading(true);
      setDelayedRecsLoading(true);
      try {
        const { data } = await recommendationAPI.get();
        if (!active) return;
        
        // Show primary recommendations first (Buy Again, Recommended For You, Trending)
        setRecs(prev => ({
          ...prev,
          buyAgain: data.buyAgain || [],
          recommendedForYou: data.recommendedForYou || [],
          trending: data.trending || []
        }));
        setRecsLoading(false);

        // Stagger setting below-the-fold recommendation sections to prevent layout calculations blocking
        setTimeout(() => {
          if (!active) return;
          setRecs(prev => ({
            ...prev,
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

    fetchRecommendations();
    
    return () => {
      active = false;
    };
  }, [user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10 pb-16">
      
      {/* Compact Hero Banner Card */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-primary-900 to-slate-900 text-white rounded-xl sm:rounded-2xl mx-4 sm:mx-8 mt-4 px-5 py-6 sm:py-8 shadow-lg flex items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
        <div className="max-w-xl relative z-10 space-y-2.5 animate-slide-up">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] sm:text-xs font-black tracking-wide text-emerald-300">
              ⚡ 30 Min Delivery
            </span>
            <span className="inline-flex items-center px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] sm:text-xs font-black tracking-wide text-emerald-300">
              🏢 Direct to Room Floor
            </span>
          </div>
          <h1 className="text-base sm:text-2xl md:text-3.5xl font-black tracking-tight leading-tight">
            Daily Hostel Essentials <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-300 via-primary-300 to-white bg-clip-text text-transparent">Delivered Instantly.</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-100 font-bold opacity-90 max-w-lg">
            Snacks, fresh fruits, veggies, stationery, and personal care.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <img
            src="https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=300&q=60&fm=webp&fit=crop"
            alt="Hostel Essentials"
            fetchPriority="high"
            decoding="async"
            width={128}
            height={128}
            className="w-24 h-24 sm:w-36 sm:h-36 object-contain drop-shadow-md rounded-xl"
          />
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider">Browse Categories</h2>
          <Link to="/products" className="text-[10px] font-black text-primary-600 hover:underline uppercase tracking-wide">View All</Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-2.5 sm:gap-4">
          {staticCategories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group p-2 sm:p-4 bg-white border border-slate-100 rounded-xl hover:border-primary-300 hover:shadow-md transition-all duration-200 text-center flex flex-col items-center space-y-1.5 sm:space-y-3 shadow-sm shrink-0"
            >
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-50 to-emerald-50 text-base sm:text-2xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-all">
                {cat.emoji}
              </div>
              <span className="text-[9px] sm:text-xs font-extrabold text-slate-700 group-hover:text-primary-700 block truncate w-full">
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
              <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Buy It Again
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Items you ordered recently</p>
            </div>
          </div>

          {recsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {recs.buyAgain.map((product, idx) => (
                <ProductCard key={product._id} product={product} priority={idx < 4} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Recommended For You */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary-650" />
              Recommended For You
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Personalized recommendations based on your preferences</p>
          </div>
        </div>

        {recsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.recommendedForYou?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {recs.recommendedForYou.map((product, idx) => (
              <ProductCard key={product._id} product={product} priority={idx < 4} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100/50">
            <p className="text-slate-400 text-xs font-semibold">No recommendations available.</p>
          </div>
        )}
      </section>

      {/* 3. Students Also Bought */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <HomeIcon className="w-4 h-4 text-emerald-650" />
              Students Also Bought
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Popular choices among students living in your hostels</p>
          </div>
        </div>

        {delayedRecsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.studentsAlsoBought?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {recs.studentsAlsoBought.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100/50">
            <p className="text-slate-400 text-xs font-semibold">No popular choices found.</p>
          </div>
        )}
      </section>

      {/* 4. Frequently Bought Together */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              Frequently Bought Together
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Common product combinations purchased in single orders</p>
          </div>
        </div>

        {delayedRecsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.frequentlyBoughtTogether?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {recs.frequentlyBoughtTogether.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100/50">
            <p className="text-slate-400 text-xs font-semibold">No combination items found.</p>
          </div>
        )}
      </section>

      {/* 5. Trending Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔥</span>
              Trending Products
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Hot products flying off the shelves this hour</p>
          </div>
        </div>

        {recsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recs.trending?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {recs.trending.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100/50">
            <p className="text-slate-400 text-xs font-semibold">No trending products found.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
