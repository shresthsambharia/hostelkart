import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productAPI } from '../api';
import ProductCard from '../components/ProductCard';
import { ShoppingBag, Truck, Gift, ClipboardSignature, RefreshCw } from 'lucide-react';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch categories
        const catRes = await productAPI.getCategories();
        setCategories(catRes.data);

        // Fetch products and mix categories
        const prodRes = await productAPI.getAll({});
        const allProds = prodRes.data;
        
        const targetCategories = ['Fruits', 'Vegetables', 'Snacks', 'Beverages', 'Dairy Products', 'Hostel Essentials'];
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

        setProducts(mixedItems.slice(0, 8));
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const featureCards = [
    { title: 'Superfast Delivery', desc: 'Delivered to your room block and floor within 30 minutes.', icon: <Truck className="w-8 h-8 text-primary-600" /> },
    { title: 'Wide Selection', desc: 'From instant noodles and soft drinks to stationery and medicines.', icon: <ShoppingBag className="w-8 h-8 text-primary-600" /> },
    { title: 'Custom Requests', desc: 'Can\'t find what you need? Send a request and we will buy it for you.', icon: <ClipboardSignature className="w-8 h-8 text-primary-600" /> },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-800 text-white rounded-3xl mx-4 sm:mx-8 mt-6 px-6 py-10 md:px-12 md:py-14 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent)] pointer-events-none"></div>
        <div className="max-w-3xl relative z-10 space-y-4 animate-slide-up">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-widest uppercase">
            Introducing HostelKart 🛒
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Daily hostel essentials <br />
            <span className="text-primary-100">delivered to your room.</span>
          </h1>
          <p className="text-sm md:text-base text-primary-50/90 font-medium max-w-xl">
            Craving snacks at 2 AM? Ran out of soap? Need medicines or stationery? We deliver direct to your hostel floor in under 30 minutes!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link to="/products" className="bg-white text-primary-800 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all text-center">
              Order Essentials
            </Link>
            <Link to="/custom-request" className="bg-primary-500/30 hover:bg-primary-500/50 border border-white/20 text-white font-bold px-8 py-3.5 rounded-xl hover:shadow-lg active:scale-95 transition-all text-center">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary-400 hover:shadow-md transition-all text-center flex flex-col items-center space-y-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary-50 text-3xl flex items-center justify-center group-hover:scale-105 group-hover:bg-primary-100 transition-all">
                {/* Emoji mapping helper depending on category */}
                {cat.name === 'Fruits' && '🍎'}
                {cat.name === 'Vegetables' && '🥦'}
                {cat.name === 'Snacks' && '🍿'}
                {cat.name === 'Beverages' && '🥤'}
                {cat.name === 'Dairy Products' && '🧀'}
                {cat.name === 'Personal Care' && '🧼'}
                {cat.name === 'Medicines' && '💊'}
                {cat.name === 'Stationery' && '📚'}
                {cat.name === 'Hostel Essentials' && '🧹'}
                {cat.name === 'Electronics Accessories' && '🔌'}
                {cat.name === 'Instant Food' && '🍜'}
                {cat.name === 'Custom Requests' && '📝'}
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-primary-700 transition-colors block">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-slate-100/60 border-y border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featureCards.map((feat) => (
              <div key={feat.title} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-4">
                <div className="p-3 bg-primary-50 rounded-xl shrink-0">{feat.icon}</div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-base">{feat.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Featured Essentials</h2>
            <p className="text-sm text-slate-500">Popular items ordered by hostel students today</p>
          </div>
          <Link to="/products" className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center space-x-1">
            <span>View All Products</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-100 rounded-2xl h-80"></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
    </div>
  );
};

export default Home;
