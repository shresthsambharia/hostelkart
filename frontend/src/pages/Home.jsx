import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI, orderAPI } from '../api';
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
  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recentlyOrdered, setRecentlyOrdered] = useState([]);
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

        // Get trending products (high rating, non-overlapping with top best sellers)
        const sortedByRating = [...allProds].sort((a, b) => b.rating - a.rating || b.numReviews - a.numReviews);
        const bestSellerIds = new Set(sortedByPopularity.slice(0, 4).map(p => p._id));
        const uniqueTrending = sortedByRating.filter(p => !bestSellerIds.has(p._id));
        setTrendingProducts(uniqueTrending.slice(0, 4));

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

  // Fetch recently ordered products
  useEffect(() => {
    if (!user || user.role !== 'student') {
      setRecentlyOrdered([]);
      return;
    }
    const fetchRecentlyOrdered = async () => {
      try {
        const { data } = await orderAPI.getMyOrders();
        const ordered = [];
        const seenIds = new Set();
        
        for (const order of data) {
          if (order.orderStatus === 'Cancelled') continue;
          for (const item of order.items) {
            if (item.product && !seenIds.has(item.product._id)) {
              seenIds.add(item.product._id);
              ordered.push(item.product);
            }
          }
        }
        setRecentlyOrdered(ordered.slice(0, 4));
      } catch (error) {
        console.error('Failed to load recently ordered items:', error);
      }
    };
    fetchRecentlyOrdered();
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
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-primary-900 to-slate-900 text-white rounded-xl sm:rounded-2xl mx-4 sm:mx-8 mt-4 px-4 py-6 sm:py-8 shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
        <div className="max-w-2xl relative z-10 space-y-2.5 animate-slide-up">
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

      {/* Recently Ordered Section (conditionally shown) */}
      {recentlyOrdered.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider">Recently Ordered</h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Your Favorites</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {recentlyOrdered.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider">Featured Products</h2>
            <p className="text-[10px] sm:text-xs text-slate-400">Popular items ordered by hostel students today</p>
          </div>
          <Link to="/products" className="text-[10px] font-black text-primary-600 hover:underline uppercase tracking-wide">
            See All &rarr;
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

      {/* Trending Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider">🔥 Trending on Campus</h2>
            <p className="text-[10px] sm:text-xs text-slate-400">Products flying off the shelves this hour</p>
          </div>
          <Link to="/products" className="text-[10px] font-black text-primary-600 hover:underline uppercase tracking-wide">
            See All &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : trendingProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {trendingProducts.map((product, idx) => (
              <ProductCard key={product._id} product={product} priority={idx < 4} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 font-medium">No trending products found.</p>
          </div>
        )}
      </section>

      {/* Best Sellers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex justify-between items-baseline">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-wider">Best Sellers</h2>
            <p className="text-[10px] sm:text-xs text-slate-400">Student favorites with the highest ratings on campus</p>
          </div>
          <Link to="/products" className="text-[10px] font-black text-primary-600 hover:underline uppercase tracking-wide">
            See All &rarr;
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
