import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../api';
import ProductCard from '../components/ProductCard';
import { 
  Search, 
  Sparkles, 
  Clock, 
  Home as HomeIcon, 
  ShieldCheck 
} from 'lucide-react';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch categories
        const catRes = await productAPI.getCategories();
        setCategories(catRes.data);

        // Fetch products
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
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-primary-900 to-slate-900 text-white rounded-3xl mx-4 sm:mx-8 mt-6 px-6 py-12 md:px-12 md:py-20 shadow-2xl">
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-72 h-72 rounded-full bg-primary-500/10 blur-3xl pointer-events-none"></div>
        
        <div className="max-w-4xl relative z-10 space-y-6 md:space-y-8 animate-slide-up">
          {/* Header pill/badges bar */}
          <div className="flex flex-wrap gap-2.5 items-center">
            <span className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold tracking-wide text-primary-200">
              ⚡ 30 Minute Delivery
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold tracking-wide text-primary-200">
              🏢 Hostel Room Delivery
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold tracking-wide text-primary-200">
              🍎 Daily Essentials
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4.5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] font-sans">
              Daily hostel essentials <br />
              <span className="bg-gradient-to-r from-primary-300 via-emerald-200 to-primary-100 bg-clip-text text-transparent">delivered to your room.</span>
            </h1>
            <p className="text-sm md:text-lg text-slate-300 font-medium max-w-2xl leading-relaxed">
              Need fresh fruits or vegetables? Ran out of soap? Need stationery or instant food? We deliver direct to your hostel floor in under 30 minutes!
            </p>
          </div>

          {/* Integrated Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl w-full">
            <div className="relative flex items-center bg-white rounded-2xl p-1.5 shadow-lg border border-slate-200 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all duration-200">
              <div className="pl-3 text-slate-400">
                <Search size={20} />
              </div>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search for instant noodles, snacks, soap, notebooks..."
                className="w-full bg-transparent border-none outline-none px-3 text-slate-800 text-sm md:text-base placeholder:text-slate-400 py-2.5"
              />
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 text-sm shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/products" className="bg-gradient-to-r from-primary-500 to-emerald-600 hover:from-primary-600 hover:to-emerald-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg active:scale-95 transition-all text-center flex items-center justify-center min-h-[48px] text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Order Essentials
            </Link>
            <Link to="/custom-request" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-3.5 rounded-xl hover:shadow-lg active:scale-95 transition-all text-center flex items-center justify-center min-h-[48px] text-sm">
              Custom Request
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Browse Categories</h2>
          <p className="text-sm text-slate-500">Quickly find whatever you need in our inventory</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group p-5 bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 rounded-2xl hover:border-primary-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center space-y-4 shadow-sm"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-50 to-emerald-50 text-3xl flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-100 group-hover:to-emerald-100 transition-all duration-300">
                {/* Emoji mapping helper depending on category */}
                {cat.name === 'Fruits' && '🍎'}
                {cat.name === 'Vegetables' && '🥦'}
                {cat.name === 'Dairy Products' && '🧀'}
                {cat.name === 'Personal Care' && '🧼'}
                {cat.name === 'Stationery' && '📚'}
                {cat.name === 'Electronics Accessories' && '🔌'}
                {cat.name === 'Instant Food' && '🍜'}
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-primary-700 transition-colors block">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Choose HostelKart */}
      <section className="bg-gradient-to-b from-slate-50 to-slate-100/80 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Why Choose HostelKart?</h2>
            <p className="text-slate-500 text-sm sm:text-base">Designed by students, for students. We make campus living easy, fast, and hassle-free.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col space-y-4 group">
              <div className="p-4 bg-emerald-50 rounded-2xl w-14 h-14 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Clock className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-lg">⚡ 30 Minute Delivery</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Craving late-night snacks or ran out of notebooks? We deliver everything direct to your hostel floor in under 30 minutes!
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col space-y-4 group">
              <div className="p-4 bg-primary-50 rounded-2xl w-14 h-14 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                <HomeIcon className="w-7 h-7 text-primary-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-lg">🏢 Hostel Room Delivery</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  No need to step outside your block. Our student delivery riders bring your order right up to your hostel room door.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col space-y-4 group">
              <div className="p-4 bg-blue-50 rounded-2xl w-14 h-14 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <ShieldCheck className="w-7 h-7 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-lg">🍎 Daily Essentials</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  From fresh fruits and vegetables to stationery, instant food, and personal care. We stock exactly what you need daily.
                </p>
              </div>
            </div>
          </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-100 rounded-2xl h-80"></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-100 rounded-2xl h-80"></div>
            ))}
          </div>
        ) : bestSellers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.map((product) => (
              <ProductCard key={product._id} product={product} />
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
