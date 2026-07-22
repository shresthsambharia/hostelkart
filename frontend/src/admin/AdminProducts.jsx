import React, { useState, useEffect } from 'react';
import { adminAPI, productAPI } from '../api';
import { 
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Upload, AlertCircle, 
  FileSpreadsheet, Download, RefreshCw, BarChart2, Search as SearchIcon, 
  ShieldAlert, Clock, User, ChevronLeft, ChevronRight, Check, X,
  ArrowUpDown, Filter, Sparkles, Layers, Sliders, ShoppingBag, Eye
} from 'lucide-react';
import { getAdminThumbnail } from '../utils/image';
import ImageUploader from '../components/ImageUploader';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [logs, setLogs] = useState([]);
  const [trendingKeywords, setTrendingKeywords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'logs', 'analytics'

  // Search, Sorting, Filtering, and Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'stock', 'discount'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState(''); // 'all', 'low', 'outofstock'
  const [availabilityFilter, setAvailabilityFilter] = useState(''); // 'all', 'available', 'unavailable'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Bulk Operations State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPriceChange, setBulkPriceChange] = useState('');
  const [bulkStockChange, setBulkStockChange] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Form Stepper States
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formStep, setFormStep] = useState(1); // Steps 1 to 5

  // Form Fields State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('Scheduled Delivery');
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrls, setImageUrls] = useState([]); // array for multi-image support

  // Custom Toast Notification Overlay state
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'warning', message: '' }

  const showToastMsg = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProductsAndCategories = async () => {
    setLoading(true);
    try {
      const prodRes = await productAPI.getAll({});
      setProducts(prodRes.data);

      const catRes = await productAPI.getCategories();
      setCategories(catRes.data);
    } catch (error) {
      console.error('Error fetching inventory details:', error);
      showToastMsg('error', 'Failed to load catalog products.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const { data } = await adminAPI.getLogs();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data } = await adminAPI.getAnalytics();
      setAnalytics(data);

      const trendingRes = await productAPI.getTrending();
      setTrendingKeywords(trendingRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const handleOpenAddModal = () => {
    setEditMode(false);
    setSelectedId(null);
    setName('');
    setPrice('');
    setDiscount('0');
    setDescription('');
    setCategory(categories[0]?.name || '');
    setStock('');
    setDeliveryTime('Scheduled Delivery');
    setIsAvailable(true);
    setImageUrls([]);
    setFormStep(1);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditMode(true);
    setSelectedId(p._id);
    setName(p.name);
    setPrice(p.price);
    setDiscount(p.discount || '0');
    setDescription(p.description);
    setCategory(p.category);
    setStock(p.stock);
    setDeliveryTime(p.deliveryTime || 'Scheduled Delivery');
    setIsAvailable(p.isAvailable);
    setImageUrls(p.image ? [p.image] : []);
    setFormStep(1);
    setModalOpen(true);
  };

  const handleStepperSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!name || !price || !category || stock === '') {
      showToastMsg('error', 'Please fill in all required product fields');
      return;
    }

    const payload = {
      name,
      price: Number(price),
      discount: Number(discount),
      description,
      category,
      stock: Number(stock),
      deliveryTime,
      isAvailable,
      image: imageUrls[0] || '/uploads/default-product.png',
    };

    try {
      if (editMode) {
        await adminAPI.updateProduct(selectedId, payload);
        showToastMsg('success', `Product "${name}" updated successfully`);
      } else {
        await adminAPI.addProduct(payload);
        showToastMsg('success', `Product "${name}" added to catalog`);
      }
      setModalOpen(false);
      fetchProductsAndCategories();
    } catch (error) {
      showToastMsg('error', error.response?.data?.message || 'Transaction failed');
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Remove "${title}" from catalog permanently?`)) {
      try {
        await adminAPI.deleteProduct(id);
        showToastMsg('success', 'Product removed successfully');
        fetchProductsAndCategories();
      } catch (error) {
        showToastMsg('error', 'Failed to remove product');
      }
    }
  };

  // Bulk operations handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p._id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} selected products?`)) {
      try {
        for (const id of selectedIds) {
          await adminAPI.deleteProduct(id);
        }
        showToastMsg('success', `Successfully deleted ${selectedIds.length} products.`);
        setSelectedIds([]);
        fetchProductsAndCategories();
      } catch (err) {
        showToastMsg('error', 'Failed to delete all selected items.');
      }
    }
  };

  const handleBulkPriceUpdate = async () => {
    const changePct = Number(bulkPriceChange);
    if (!changePct || isNaN(changePct)) return;

    try {
      for (const id of selectedIds) {
        const prod = products.find((p) => p._id === id);
        if (prod) {
          const newPrice = Math.max(1, Math.round(prod.price * (1 + changePct / 100)));
          await adminAPI.updateProduct(id, { price: newPrice });
        }
      }
      showToastMsg('success', `Updated prices for ${selectedIds.length} products.`);
      setBulkPriceChange('');
      setSelectedIds([]);
      fetchProductsAndCategories();
    } catch (err) {
      showToastMsg('error', 'Failed to update prices.');
    }
  };

  const handleBulkStockUpdate = async () => {
    const qty = Number(bulkStockChange);
    if (isNaN(qty)) return;

    try {
      for (const id of selectedIds) {
        await adminAPI.updateProduct(id, { stock: qty });
      }
      showToastMsg('success', `Updated stock levels to ${qty} for ${selectedIds.length} products.`);
      setBulkStockChange('');
      setSelectedIds([]);
      fetchProductsAndCategories();
    } catch (err) {
      showToastMsg('error', 'Failed to update stock levels.');
    }
  };

  const handleDownloadExcel = async (apiCall, filename) => {
    showToastMsg('info', `Generating ${filename}...`);
    try {
      const res = await apiCall();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
      showToastMsg('success', `${filename} generated!`);
    } catch (err) {
      showToastMsg('error', 'Failed to generate Excel download.');
    }
  };

  const handleExcelImport = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showToastMsg('info', 'Processing spreadsheet import...');

    try {
      let res;
      if (type === 'import-products') {
        res = await adminAPI.importProducts(formData);
      } else {
        res = await adminAPI.bulkInventoryUpdate(formData);
      }
      
      const { message, errors } = res.data;
      if (errors && errors.length > 0) {
        showToastMsg('warning', `${message} (with warnings)`);
      } else {
        showToastMsg('success', message);
      }
      fetchProductsAndCategories();
    } catch (err) {
      showToastMsg('error', err.response?.data?.message || 'Failed to parse Excel file.');
    }
  };

  // 1. Filter Logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.stock <= 5;
    else if (stockFilter === 'outofstock') matchesStock = p.stock === 0;

    let matchesAvail = true;
    if (availabilityFilter === 'available') matchesAvail = p.isAvailable && p.stock > 0;
    else if (availabilityFilter === 'unavailable') matchesAvail = !p.isAvailable || p.stock === 0;

    return matchesSearch && matchesCategory && matchesStock && matchesAvail;
  });

  // 2. Sort Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (typeof valA === 'string') {
      return sortOrder === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }
    
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  // 3. Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 pb-24 bg-slate-50/10 min-h-screen relative">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-2xl border shadow-xl flex items-center gap-3 animate-slide-in transition-all ${
          toast.type === 'success' ? 'bg-emerald-500 border-emerald-600 text-white' :
          toast.type === 'warning' ? 'bg-amber-500 border-amber-600 text-white' :
          'bg-rose-500 border-rose-600 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'warning' && <AlertCircle size={16} />}
          {toast.type === 'error' && <XCircle size={16} />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary-600 rounded-full block"></span>
            HostelKart Catalog Center
          </h1>
          <p className="text-[11px] text-slate-450 font-bold uppercase mt-1">Configure inventory listings, spreadsheets imports, and audit events</p>
        </div>
        {activeTab === 'catalog' && (
          <button 
            onClick={handleOpenAddModal} 
            className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-4 shadow-sm hover:-translate-y-0.5 transition-transform"
          >
            <Plus size={14} />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-50 p-1 rounded-xl w-fit border border-slate-200/50">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
            activeTab === 'catalog' ? 'bg-white text-primary-600 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📦 Inventory Grid
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
            activeTab === 'logs' ? 'bg-white text-primary-600 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          🛡️ Security Logs
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
            activeTab === 'analytics' ? 'bg-white text-primary-600 shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📊 Search Stats
        </button>
      </div>

      {/* ==================== CATALOG GRID TAB ==================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          
          {/* Advanced Excel Operations Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-premium space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-100 pb-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wide">Spreadsheet Synchronization Manager</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Export */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Download className="w-3 h-3 text-primary-600" />
                  Export Data Sheets
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownloadExcel(adminAPI.exportProducts, 'HostelKart_Products.xlsx')}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 rounded-xl transition-all"
                  >
                    Catalog (.xlsx)
                  </button>
                  <button
                    onClick={() => handleDownloadExcel(adminAPI.exportOrders, 'HostelKart_Orders.xlsx')}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 rounded-xl transition-all"
                  >
                    Orders (.xlsx)
                  </button>
                </div>
              </div>

              {/* Import Products */}
              <div className="space-y-2 border-l border-slate-100 pl-0 md:pl-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Upload className="w-3 h-3 text-emerald-600" />
                  Import Catalog Sheet
                </h4>
                <input
                  type="file"
                  id="import-excel-file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => handleExcelImport(e, 'import-products')}
                />
                <label
                  htmlFor="import-excel-file"
                  className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] font-bold text-slate-600 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Upload Products XLSX
                </label>
              </div>

              {/* Bulk Stock Excel */}
              <div className="space-y-2 border-l border-slate-100 pl-0 md:pl-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-blue-600" />
                  Sync Stock Levels
                </h4>
                <input
                  type="file"
                  id="inventory-excel-file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => handleExcelImport(e, 'bulk-inventory')}
                />
                <label
                  htmlFor="inventory-excel-file"
                  className="w-full py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] font-bold text-slate-600 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
                  Sync Stocks XLSX
                </label>
              </div>
            </div>
          </div>

          {/* Bulk Operations Overlay Control */}
          {selectedIds.length > 0 && (
            <div className="bg-primary-50 border border-primary-150 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-slide-up">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-primary-800 bg-primary-100 border border-primary-200 px-2.5 py-1 rounded-xl shadow-sm">
                  {selectedIds.length} Selected
                </span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-bold text-primary-650 hover:underline"
                >
                  Deselect All
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Bulk Price */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Price % (e.g. 5, -5)"
                    value={bulkPriceChange}
                    onChange={(e) => setBulkPriceChange(e.target.value)}
                    className="w-28 p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                  <button
                    onClick={handleBulkPriceUpdate}
                    disabled={!bulkPriceChange}
                    className="bg-primary-600 hover:bg-primary-750 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl disabled:opacity-50 transition-colors"
                  >
                    Adjust Prices
                  </button>
                </div>

                {/* Bulk Stock */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="New stock qty"
                    value={bulkStockChange}
                    onChange={(e) => setBulkStockChange(e.target.value)}
                    className="w-28 p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                  <button
                    onClick={handleBulkStockUpdate}
                    disabled={!bulkStockChange}
                    className="bg-primary-600 hover:bg-primary-750 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl disabled:opacity-50 transition-colors"
                  >
                    Set Stocks
                  </button>
                </div>

                {/* Bulk Delete */}
                <button
                  onClick={handleBulkDelete}
                  className="bg-rose-600 hover:bg-rose-750 text-white font-black text-[10px] px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          )}

          {/* Custom Search & Filters Grid */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-premium grid grid-cols-1 md:grid-cols-5 gap-3.5 items-center">
            
            {/* Search */}
            <div className="relative md:col-span-2">
              <SearchIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog items..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50/50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50/50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-650 outline-none focus:bg-white transition-all"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Stock Level Filter */}
            <select
              value={stockFilter}
              onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50/50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-650 outline-none focus:bg-white transition-all"
            >
              <option value="">All Inventory Statuses</option>
              <option value="low">⚠️ Low Stock (≤ 5 units)</option>
              <option value="outofstock">❌ Out of Stock</option>
            </select>

            {/* Availability Filter */}
            <select
              value={availabilityFilter}
              onChange={(e) => { setAvailabilityFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50/50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-650 outline-none focus:bg-white transition-all"
            >
              <option value="">All Availabilities</option>
              <option value="available">🟢 Active & In Stock</option>
              <option value="unavailable">🔴 Sold Out / Suspended</option>
            </select>

          </div>

          {/* Product Data Grid Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold select-none">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-350 text-primary-600 focus:ring-primary-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </th>
                    <th className="py-3.5 px-4">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-600">
                        <span>Product Specification</span>
                        <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th className="py-3.5 px-2">Category</th>
                    <th className="py-3.5 px-2">
                      <button onClick={() => toggleSort('price')} className="flex items-center gap-1 hover:text-slate-600">
                        <span>Price</span>
                        <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th className="py-3.5 px-2 text-center">
                      <button onClick={() => toggleSort('discount')} className="flex items-center gap-1 hover:text-slate-600">
                        <span>Discount</span>
                        <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th className="py-3.5 px-2">
                      <button onClick={() => toggleSort('stock')} className="flex items-center gap-1 hover:text-slate-600">
                        <span>Stock Level</span>
                        <ArrowUpDown size={11} />
                      </button>
                    </th>
                    <th className="py-3.5 px-2">Logistics</th>
                    <th className="py-3.5 px-2">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2 animate-pulse">
                          <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
                          <span className="font-bold">Syncing catalog registry...</span>
                        </div>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 italic font-semibold">
                        No product listings match your filters.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((p) => {
                      const isSelected = selectedIds.includes(p._id);
                      return (
                        <tr key={p._id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-primary-50/10' : ''}`}>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(p._id)}
                              className="rounded border-slate-350 text-primary-600 focus:ring-primary-500 cursor-pointer w-3.5 h-3.5"
                            />
                          </td>
                          <td className="py-3 px-4 flex items-center space-x-3">
                            <div className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                              <img
                                src={getAdminThumbnail(p)}
                                alt={p.name}
                                className="w-9 h-9 object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-800 block truncate max-w-[200px]">{p.name}</span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[220px] font-bold mt-0.5 leading-none">{p.description}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 font-bold text-slate-700">{p.category}</td>
                          <td className="py-3 px-2 font-extrabold text-slate-800">₹{p.price}</td>
                          <td className="py-3 px-2 text-center">
                            {p.discount > 0 ? (
                              <span className="px-1.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[9px] font-black">
                                {p.discount}% OFF
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-bold">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                              p.stock === 0 ? 'bg-red-50 text-red-700 border-red-100' :
                              p.stock <= 5 ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                              'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {p.stock} Units
                            </span>
                          </td>
                          <td className="py-3 px-2 font-bold text-[10px] text-slate-500">{p.deliveryTime || 'Instant Slot'}</td>
                          <td className="py-3 px-2">
                            {p.isAvailable && p.stock > 0 ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="text-red-500 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                <span>Sold Out</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 border border-slate-100 rounded-lg transition-colors shadow-sm bg-white"
                                title="Edit Specifications"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(p._id, p.name)}
                                className="p-1.5 text-red-500 hover:bg-red-50 border border-slate-100 rounded-lg transition-colors shadow-sm bg-white"
                                title="Remove Item"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-t border-slate-100 select-none">
                <span className="text-[10px] font-bold text-slate-450 uppercase">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedProducts.length)} of {sortedProducts.length} Listings
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 transition-opacity"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span className="text-xs font-black text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 transition-opacity"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ==================== SECURITY AUDIT LOGS TAB ==================== */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-premium overflow-hidden space-y-4 p-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Security Audit Trail</h3>
              <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Captures MERN state write endpoint operations</p>
            </div>
            <button onClick={fetchLogs} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-650 flex items-center gap-1">
              <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
              <span>Refresh Log Registry</span>
            </button>
          </div>

          {logsLoading ? (
            <div className="p-12 space-y-3">
              <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3"></div>
              <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-slate-450 italic py-10 text-center font-medium">No actions captured in audit log.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-50 text-slate-400 font-bold">
                    <th className="py-2.5 px-2">Timestamp</th>
                    <th className="py-2.5 px-2">Authorized Officer</th>
                    <th className="py-2.5 px-2">Method</th>
                    <th className="py-2.5 px-2">Endpoint URL</th>
                    <th className="py-2.5 px-2 font-bold">Audit Action details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 font-medium">
                      <td className="py-3 px-2 text-slate-400 font-semibold">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-2 font-bold text-slate-800">{log.admin?.name || 'Deleted Admin'}</td>
                      <td className="py-3 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          log.method === 'POST' ? 'bg-emerald-50 text-emerald-700' :
                          log.method === 'PUT' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-mono text-[10px] text-slate-500">{log.url}</td>
                      <td className="py-3 px-2">
                        <span className="font-bold text-slate-850 block">{log.action}</span>
                        <span className="text-[10px] text-slate-450 block truncate max-w-[280px]">{JSON.stringify(log.details)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== ANALYTICS STATS TAB ==================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Analyzing search indicators...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Keywords */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-premium space-y-4">
                <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-100 pb-2">
                  <SearchIcon className="w-4 h-4 text-primary-600 animate-bounce" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wide">Campus Keyword Trends</h3>
                </div>
                {trendingKeywords.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No search metrics stored.</p>
                ) : (
                  <div className="space-y-2">
                    {trendingKeywords.map((kw, i) => (
                      <div key={kw._id || i} className="flex justify-between items-center py-2 border-b border-slate-50 text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <span className="text-slate-350">#{i+1}</span>
                          {kw.keyword}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-[10px] text-slate-500 font-black rounded-lg">
                          {kw.count} queries
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Products */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-premium space-y-4">
                <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-100 pb-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wide">High Velocity Product Leaderboard</h3>
                </div>
                <div className="space-y-4">
                  {analytics?.topSelling?.slice(0, 5).map((p, i) => (
                    <div key={p._id || i} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="truncate max-w-[150px]">{p.name}</span>
                        <span>{p.totalQty} Units sold</span>
                      </div>
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${Math.min(100, (p.totalQty / 20) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ==================== REDESIGNED STEPPER FORM MODAL ==================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-white w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 select-none">
              <div>
                <h2 className="text-base font-black text-slate-800">
                  {editMode ? 'Modify Product Specifications' : 'Insert Product into Catalog'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Step {formStep} of 5</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-slate-450 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex gap-0.5 select-none">
              {[1, 2, 3, 4, 5].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`flex-1 h-full rounded-full transition-all ${
                    formStep >= stepNum ? 'bg-primary-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Stepper Steps content container */}
            <div className="py-2.5">
              
              {/* STEP 1: Basic Specifications */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3 bg-primary-50/50 rounded-xl border border-primary-100/50 flex items-center gap-2.5 text-xs text-primary-800">
                    <Sparkles className="w-4 h-4 shrink-0 animate-spin-slow" />
                    <span className="font-bold">Provide clear titles and summaries for student searches.</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Product Title</label>
                    <input
                      type="text"
                      className="input-field text-xs py-2"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Details & Description</label>
                    <textarea
                      rows={3}
                      className="input-field text-xs py-2"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Active Category</label>
                    <select
                      className="input-field text-xs py-2 bg-white"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: Pricing & Discounts */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50/55 rounded-xl border border-blue-100/50 flex items-center gap-2.5 text-xs text-blue-800">
                    <Sliders className="w-4 h-4 shrink-0" />
                    <span className="font-bold">Configure base fees and promotional discounts.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Retail Price (₹)</label>
                      <input
                        type="number"
                        className="input-field text-xs py-2"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Discount Rate (%)</label>
                      <input
                        type="number"
                        className="input-field text-xs py-2"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Calculated summary card */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1.5 select-none">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Sticker Price:</span>
                      <span>₹{Number(price) || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-rose-600">
                      <span>Discount deduction ({Number(discount) || 0}%):</span>
                      <span>- ₹{Math.round((Number(price) || 0) * (Number(discount) || 0) / 100)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-800 border-t border-slate-200/50 pt-2">
                      <span>Final Student price:</span>
                      <span className="text-emerald-600">₹{Math.max(0, Math.round((Number(price) || 0) * (1 - (Number(discount) || 0) / 100)))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Inventory & Logistics */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100/50 flex items-center gap-2.5 text-xs text-purple-800">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span className="font-bold">Define stock caps and fulfillment parameters.</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Warehouse Stock Units</label>
                    <input
                      type="number"
                      className="input-field text-xs py-2"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-450 block mb-1">Delivery SLA Frame</label>
                    <input
                      type="text"
                      className="input-field text-xs py-2"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="avail"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="rounded border-slate-350 text-primary-600 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="avail" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Active and purchasable by students in storefront
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 4: Product Image Uploader */}
              {formStep === 4 && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 flex items-center gap-2.5 text-xs text-emerald-800">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="font-bold">Attach responsive images with automatic compression.</span>
                  </div>
                  
                  {/* Reuse our newly created ImageUploader component */}
                  <ImageUploader 
                    images={imageUrls}
                    onChange={(urls) => setImageUrls(urls)}
                    maxFiles={1}
                  />
                </div>
              )}

              {/* STEP 5: Live Card Preview */}
              {formStep === 5 && (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-full p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 flex items-center gap-2.5 text-xs text-amber-800">
                    <Eye className="w-4 h-4 shrink-0" />
                    <span className="font-bold">Verification: Storefront item layout rendering preview.</span>
                  </div>

                  {/* Customer Storefront product card preview */}
                  <div className="w-56 bg-white border border-slate-100 rounded-3xl shadow-premium overflow-hidden flex flex-col justify-between min-h-[280px]">
                    <div className="h-36 bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                      <img 
                        src={imageUrls[0] || '/uploads/default-product.png'}
                        alt="Preview image"
                        className="w-28 h-28 object-contain"
                      />
                      {Number(discount) > 0 && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{category || 'Default Category'}</span>
                        <h4 className="font-extrabold text-slate-800 text-xs truncate">{name || 'Default Product Name'}</h4>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-sm text-slate-800">
                            ₹{Math.max(0, Math.round((Number(price) || 0) * (1 - (Number(discount) || 0) / 100)))}
                          </span>
                          {Number(discount) > 0 && (
                            <span className="text-[9px] text-slate-400 font-bold line-through">₹{price}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">
                          In Stock
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Stepper Modal Footer Controls */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-4 select-none">
              <button
                type="button"
                onClick={() => setFormStep(formStep - 1)}
                disabled={formStep === 1}
                className="btn-secondary py-2 px-4 text-xs font-bold disabled:opacity-40"
              >
                Back
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                {formStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep(formStep + 1)}
                    className="btn-primary py-2 px-4 text-xs font-bold"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStepperSubmit}
                    className="btn-primary py-2 px-5 text-xs font-black shadow-md"
                  >
                    {editMode ? 'Save Specs' : 'Publish Product'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminProducts;
