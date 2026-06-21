import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../api';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
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
  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch only products to minimize network roundtrips and improve speed
        const prodRes = await productAPI.getAll({});
        const allProds = prodRes.data;
        
        // Dynamically get best sellers
        const sortedByPopularity = [...allProds].sort((a, b) => b.numReviews - a.numReviews || b.rating - a.rating);
        setBestSellers(sortedByPopularity.slice(0, 4));

        const targetCategories = ['Fruits', 'Vegetables', 'Dairy Products', 'Stationery', 'Instant Food', 'Electronics Accessories', 'Personal Care'];
        const mixedItems = [];
        const itemsByCategory = {};
        
        targetCategories.forEach(cat => {
          itemsByCategory[cat] = allProds.filter(p => p.category === cat);
        });
        
        let index = 0;
        while (mixedItems.length < 8) {
          let addedInThisRound = false;
          for (const cat of targetCategories) {
            const list = itemsByCategory[cat] || [];
            if (index < list.length) {
              mixedItems.push(list[index]);
              addedInThisRound = true;
            }
            if (mixedItems.length >= 8) break;
          }
          if (!addedInThisRound) break;
          index++;
        }
        
        if (mixedItems.length < 8) {
          const remaining = allProds.filter(p => !mixedItems.some(m => m._id === p._id));
          mixedItems.push(...remaining.slice(0, 8 - mixedItems.length));
        }

        if (mixedItems.length === 0 && allProds.length > 0) {
          mixedItems.push(...allProds.slice(0, 8));
        }
        
        setProducts(mixedItems.slice(0, 8));
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-primary-900 to-slate-900 text-white rounded-2xl sm:rounded-3xl mx-4 sm:mx-8 mt-4 sm:mt-6 px-4 py-5 sm:px-6 sm:py-8 md:px-10 md:py-12 shadow-2xl">
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-72 h-72 rounded-full bg-primary-500/10 blur-3xl pointer-events-none"></div>
        
        <div className="max-w-4xl relative z-10 space-y-3 sm:space-y-4 md:space-y-6 animate-slide-up">
          {/* Header pill/badges bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0 scroll-smooth">
            <span className="inline-flex items-center px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-xs font-bold tracking-wide text-emerald-300 shrink-0">
              ⚡ 30 Min Delivery
            </span>
            <span className="inline-flex items-center px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-xs font-bold tracking-wide text-emerald-300 shrink-0">
              🏢 Room Delivery
            </span>
            <span className="inline-flex items-center px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-xs font-bold tracking-wide text-emerald-300 shrink-0">
              🍎 Daily Essentials
            </span>
          </div>

          <div className="space-y-1.5 sm:space-y-3">
            <h1 className="text-xl sm:text-3.5xl md:text-5xl font-black tracking-tight leading-[1.1] font-sans drop-shadow-md">
              Daily hostel essentials <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-300 via-primary-300 to-white bg-clip-text text-transparent">delivered to your room.</span>
            </h1>
            <p className="text-[11px] sm:text-sm md:text-base text-slate-100 font-medium max-w-2xl leading-relaxed opacity-95">
              Need fruits, veggies, snacks, stationery or personal care? We deliver direct to your hostel room floor in under 30 minutes!
            </p>
          </div>

          {/* Integrated Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl w-full">
            <div className="relative flex items-center bg-white rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-lg border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all duration-200">
              <div className="pl-2 sm:pl-3 text-slate-400">
                <Search size={18} className="sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search instant noodles, snacks, soap..."
                className="w-full bg-transparent border-none outline-none px-2 sm:px-3 text-slate-800 text-[11px] sm:text-sm md:text-base placeholder:text-slate-400 py-1.5 sm:py-2.5"
              />
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl transition-all shadow-md active:scale-95 text-xs sm:text-sm shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Action buttons */}
          <div className="flex flex-row gap-2.5 pt-1 w-full sm:w-auto">
            <Link to="/products" className="flex-1 sm:flex-initial bg-gradient-to-r from-primary-500 to-emerald-600 hover:from-primary-600 hover:to-emerald-700 text-white font-bold px-3 py-2.5 sm:px-8 sm:py-3.5 rounded-xl shadow-lg active:scale-95 transition-all text-center flex items-center justify-center min-h-[38px] sm:min-h-[48px] text-xs sm:text-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 sm:w-4 sm:h-4 sm:mr-2 shrink-0" />
              <span>Order Essentials</span>
            </Link>
            <Link to="/custom-request" className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-3 py-2.5 sm:px-8 sm:py-3.5 rounded-xl hover:shadow-lg active:scale-95 transition-all text-center flex items-center justify-center min-h-[38px] sm:min-h-[48px] text-xs sm:text-sm">
              <span>Custom Request</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <div className="text-center md:text-left">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Browse Categories</h2>
          <p className="text-xs sm:text-sm text-slate-500">Quickly find whatever you need in our inventory</p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-3 sm:gap-4">
          {staticCategories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group p-2.5 sm:p-5 bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 rounded-xl sm:rounded-2xl hover:border-primary-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center space-y-2 sm:space-y-4 shadow-sm"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-50 to-emerald-50 text-xl sm:text-3xl flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-100 group-hover:to-emerald-100 transition-all duration-300">
                {cat.emoji}
              </div>
              <span className="text-[10px] sm:text-sm font-bold text-slate-700 group-hover:text-primary-700 transition-colors block truncate w-full font-sans">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>


      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 text-xs font-bold rounded-full uppercase tracking-wider">
                Trending
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">Featured Products</h2>
            <p className="text-sm text-slate-500">Popular items ordered by hostel students today</p>
          </div>
          <Link to="/products" className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center space-x-1">
            <span>View All Products</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, idx) => (
              <ProductCard key={product._id} product={product} priority={idx < 4} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 font-medium">No featured products found.</p>
          </div>
        )}
      </section>

      {/* Best Sellers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
                Top Rated
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">Best Sellers</h2>
            <p className="text-sm text-slate-500">Student favorites with the highest ratings on campus</p>
          </div>
          <Link to="/products" className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center space-x-1">
            <span>View All</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : bestSellers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.map((product, idx) => (
              <ProductCard key={product._id} product={product} priority={idx < 4} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 font-medium">No best sellers found.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
