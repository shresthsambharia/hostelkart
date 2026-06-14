import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { productAPI } from '../api';
import ProductCard from '../components/ProductCard';
import { SlidersHorizontal, Search, RefreshCw, X } from 'lucide-react';

const ProductListing = () => {
  const location = useLocation();
  
  // Parse initial query params
  const getQueryParams = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      keyword: searchParams.get('keyword') || '',
      category: searchParams.get('category') || '',
    };
  };

  const queryParams = getQueryParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [keyword, setKeyword] = useState(queryParams.keyword);
  const [selectedCategory, setSelectedCategory] = useState(queryParams.category);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Synchronize when URL change (e.g. Nav searches)
  useEffect(() => {
    const params = getQueryParams();
    setKeyword(params.keyword);
    setSelectedCategory(params.category);
  }, [location.search]);

  // Load Categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await productAPI.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Products based on filters
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (keyword) params.keyword = keyword;
      if (selectedCategory) params.category = selectedCategory;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const { data } = await productAPI.getAll(params);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [keyword, selectedCategory, minPrice, maxPrice]);

  const handleClearFilters = () => {
    setKeyword('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Filters Sidebar (Desktop) */}
        <aside className="hidden lg:block w-64 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm shrink-0 self-start space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center space-x-2">
              <SlidersHorizontal size={18} />
              <span>Filters</span>
            </h3>
            {(selectedCategory || minPrice || maxPrice || keyword) && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 text-sm">Categories</h4>
            <div className="flex flex-col space-y-2 max-h-60 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`text-left text-sm py-1.5 px-3 rounded-lg font-medium transition-colors ${
                  selectedCategory === ''
                    ? 'bg-primary-50 text-primary-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`text-left text-sm py-1.5 px-3 rounded-lg font-medium transition-colors ${
                    selectedCategory === cat.name
                      ? 'bg-primary-50 text-primary-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price range filter */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h4 className="font-bold text-slate-700 text-sm">Price Range (₹)</h4>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min"
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span className="text-slate-400 font-medium">-</span>
              <input
                type="number"
                placeholder="Max"
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
        </aside>

        {/* Product Listings grid */}
        <main className="flex-1 space-y-6">
          {/* Top Actions Row */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Search Input inline */}
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Filter results..."
                className="w-full border border-slate-200 rounded-lg py-2 pl-4 pr-10 outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              {keyword ? (
                <button onClick={() => setKeyword('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              ) : (
                <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
              )}
            </div>

            <div className="text-sm text-slate-500 font-medium self-center">
              Showing <span className="font-bold text-slate-800">{products.length}</span> essentials
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg text-sm font-bold transition-all"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </button>
          </div>

          {/* Grid list */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white border border-slate-100 rounded-2xl h-80"></div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="text-5xl">📦</div>
              <h3 className="text-lg font-bold text-slate-700">No products found</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                We couldn't find any items matching your filters. Try clearing search fields.
              </p>
              <button onClick={handleClearFilters} className="btn-primary py-1.5 px-4 text-xs">
                Clear Filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Drawer Filter */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/60 backdrop-blur-[2px]">
          <div className="relative w-80 max-w-sm bg-white h-full p-6 shadow-2xl flex flex-col justify-between animate-fade-in">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center space-x-2">
                  <SlidersHorizontal size={18} />
                  <span>Filters</span>
                </h3>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              {/* Category Filter */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 text-sm">Categories</h4>
                <div className="flex flex-col space-y-2 max-h-60 overflow-y-auto pr-1">
                  <button
                    onClick={() => { setSelectedCategory(''); setSidebarOpen(false); }}
                    className={`text-left text-sm py-1.5 px-3 rounded-lg font-medium transition-colors ${
                      selectedCategory === '' ? 'bg-primary-50 text-primary-700 font-bold' : 'text-slate-600'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => { setSelectedCategory(cat.name); setSidebarOpen(false); }}
                      className={`text-left text-sm py-1.5 px-3 rounded-lg font-medium transition-colors ${
                        selectedCategory === cat.name ? 'bg-primary-50 text-primary-700 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range filter */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-700 text-sm">Price Range (₹)</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button onClick={() => setSidebarOpen(false)} className="w-full btn-primary py-2.5 text-sm">
              Show Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListing;
