import React, { useState, useEffect } from 'react';
import { adminAPI, productAPI } from '../api';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Upload, AlertCircle, FileSpreadsheet, Download, RefreshCw, BarChart2, Search as SearchIcon, ShieldAlert, Clock, User } from 'lucide-react';
import { getAdminThumbnail } from '../utils/image';
import VirtualizedTable from '../components/VirtualizedTable';

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

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('30 mins');
  const [isAvailable, setIsAvailable] = useState(true);
  const [image, setImage] = useState('');

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Alert message
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchProductsAndCategories = async () => {
    setLoading(true);
    try {
      const prodRes = await productAPI.getAll({});
      setProducts(prodRes.data);

      const catRes = await productAPI.getCategories();
      setCategories(catRes.data);
    } catch (error) {
      console.error('Error fetching inventory details:', error);
      setAlert({ type: 'error', message: 'Failed to load catalog products.' });
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
    setCategory(categories[0]?.name || 'Fruits');
    setStock('');
    setDeliveryTime('30 mins');
    setIsAvailable(true);
    setImage('/uploads/default-product.png');
    setUploadError('');
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
    setDeliveryTime(p.deliveryTime || '30 mins');
    setIsAvailable(p.isAvailable);
    setImage(p.image);
    setUploadError('');
    setModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    setUploadError('');

    try {
      const { data } = await adminAPI.uploadImage(formData);
      setImage(data.image);
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Error uploading image file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    if (!name || !price || !category || stock === '') {
      setAlert({ type: 'error', message: 'Please enter all required specifications' });
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
      image,
    };

    try {
      if (editMode) {
        await adminAPI.updateProduct(selectedId, payload);
        setAlert({ type: 'success', message: `Product "${name}" updated successfully` });
      } else {
        await adminAPI.addProduct(payload);
        setAlert({ type: 'success', message: `Product "${name}" created successfully` });
      }
      setModalOpen(false);
      fetchProductsAndCategories();
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Transaction failed' });
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from catalog?`)) {
      try {
        await adminAPI.deleteProduct(id);
        setAlert({ type: 'success', message: 'Product removed successfully' });
        fetchProductsAndCategories();
      } catch (error) {
        setAlert({ type: 'error', message: 'Failed to remove product' });
      }
    }
  };

  // Excel handlers
  const handleDownloadExcel = async (apiCall, filename) => {
    setAlert({ type: 'info', message: `Generating ${filename}...` });
    try {
      const res = await apiCall();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
      setAlert({ type: 'success', message: `${filename} downloaded successfully.` });
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to generate Excel download.' });
    }
  };

  const handleExcelImport = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setAlert({ type: 'info', message: 'Processing Excel sheet import...' });

    try {
      let res;
      if (type === 'import-products') {
        res = await adminAPI.importProducts(formData);
      } else {
        res = await adminAPI.bulkInventoryUpdate(formData);
      }
      
      const { message, errors } = res.data;
      if (errors && errors.length > 0) {
        setAlert({
          type: 'warning',
          message: `${message} Warnings: ${errors.slice(0, 3).join(', ')}...`
        });
      } else {
        setAlert({ type: 'success', message });
      }
      fetchProductsAndCategories();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to process Excel sheet.' });
    }
  };

  // Table Virtualizer Header
  const productTableHeader = (
    <div className="grid grid-cols-12 gap-2 text-slate-400 font-bold text-xs p-4 bg-slate-50 border-b border-slate-100 select-none">
      <div className="col-span-4">Item Details</div>
      <div className="col-span-2">Category</div>
      <div className="col-span-1.5 font-bold">Price</div>
      <div className="col-span-1.5 font-bold">Discount</div>
      <div className="col-span-1.5">Stock</div>
      <div className="col-span-1">Status</div>
      <div className="col-span-0.5 text-center">Actions</div>
    </div>
  );

  // Table Virtualizer Row
  const renderProductRow = (p) => (
    <div
      key={p._id}
      style={{ height: 72 }}
      className="grid grid-cols-12 gap-2 items-center text-xs p-4 border-b border-slate-100 font-medium text-slate-650 hover:bg-slate-50/30 transition-colors"
    >
      <div className="col-span-4 flex items-center space-x-3 truncate">
        <div className="w-12 h-12 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          <img
            src={getAdminThumbnail(p)}
            alt={p.name}
            className="w-10 h-10 object-contain"
          />
        </div>
        <div className="truncate">
          <span className="font-bold text-slate-800 block truncate">{p.name}</span>
          <span className="text-[10px] text-slate-400 block truncate mt-0.5 leading-none">{p.description}</span>
        </div>
      </div>
      <div className="col-span-2 truncate">{p.category}</div>
      <div className="col-span-1.5 font-bold text-slate-800">₹{p.price}</div>
      <div className="col-span-1.5 font-bold text-rose-600">{p.discount || 0}% OFF</div>
      <div className="col-span-1.5">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          p.stock <= 5 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-700'
        }`}>
          {p.stock} Units
        </span>
      </div>
      <div className="col-span-1">
        {p.isAvailable && p.stock > 0 ? (
          <span className="text-emerald-600 font-bold flex items-center space-x-1">
            <CheckCircle2 size={12} className="shrink-0" />
            <span>Active</span>
          </span>
        ) : (
          <span className="text-red-500 font-bold flex items-center space-x-1">
            <XCircle size={12} className="shrink-0" />
            <span>Sold Out</span>
          </span>
        )}
      </div>
      <div className="col-span-0.5 flex items-center space-x-2 justify-center">
        <button
          onClick={() => handleOpenEditModal(p)}
          className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
          title="Edit Product"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => handleDelete(p._id, p.name)}
          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Delete Product"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  // Audit Logs Header
  const logsTableHeader = (
    <div className="grid grid-cols-12 gap-2 text-slate-400 font-bold text-xs p-4 bg-slate-50 border-b border-slate-100 select-none">
      <div className="col-span-3">Timestamp</div>
      <div className="col-span-2">Admin</div>
      <div className="col-span-1">Method</div>
      <div className="col-span-2">Endpoint</div>
      <div className="col-span-4">Details / Action</div>
    </div>
  );

  // Audit Logs Row
  const renderLogRow = (log) => (
    <div
      key={log._id}
      style={{ height: 60 }}
      className="grid grid-cols-12 gap-2 items-center text-xs p-4 border-b border-slate-100 font-medium text-slate-650 hover:bg-slate-55 transition-colors"
    >
      <div className="col-span-3 flex items-center space-x-1.5 text-slate-450">
        <Clock size={11} />
        <span>{new Date(log.timestamp).toLocaleString()}</span>
      </div>
      <div className="col-span-2 truncate flex items-center space-x-1">
        <User size={11} className="text-slate-400" />
        <span className="font-bold text-slate-750 truncate">{log.admin?.name || 'Unknown'}</span>
      </div>
      <div className="col-span-1">
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
          log.method === 'POST' ? 'bg-emerald-50 text-emerald-700' :
          log.method === 'PUT' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
        }`}>
          {log.method}
        </span>
      </div>
      <div className="col-span-2 truncate font-mono text-[10px] text-slate-500">{log.url}</div>
      <div className="col-span-4 truncate text-slate-700">
        <span className="font-bold">{log.action}: </span>
        <span className="text-[10px] text-slate-450">{JSON.stringify(log.details)}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6 p-6 animate-slide-up">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">HostelKart Management Center</h1>
            <p className="text-sm text-slate-500">Configure catalog inventory, import Excel sheets, view audit security logs & search analytics</p>
          </div>
          {activeTab === 'catalog' && (
            <button onClick={handleOpenAddModal} className="btn-primary flex items-center space-x-1.5 text-sm py-2 px-4 shadow-md">
              <Plus size={16} />
              <span>Add New Product</span>
            </button>
          )}
        </div>

        {/* Tab switch navigation */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
              activeTab === 'catalog' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📦 Product Catalog
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
              activeTab === 'logs' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🛡️ Audit Security Logs
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
              activeTab === 'analytics' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📊 Search & Recommendations
          </button>
        </div>

        {/* Alert Banner */}
        {alert.message && (
          <div className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            alert.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
            alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
            'bg-red-50 border-red-100 text-red-700'
          }`}>
            <span>{alert.message}</span>
            <button onClick={() => setAlert({ type: '', message: '' })} className="font-bold text-xs hover:underline">Dismiss</button>
          </div>
        )}

        {/* ==================== TAB 1: PRODUCT CATALOG ==================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            
            {/* Excel Upload / Download Panel Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-50 pb-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-extrabold uppercase tracking-wide">Excel Importing / Exporting Operations</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Export Card */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <Download className="w-3.5 h-3.5 text-primary-600" />
                    Export Spreadsheets
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownloadExcel(adminAPI.exportProducts, 'HostelKart_Products.xlsx')}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-xl transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>Products (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleDownloadExcel(adminAPI.exportOrders, 'HostelKart_Orders.xlsx')}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-xl transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>Orders (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleDownloadExcel(adminAPI.exportCustomers, 'HostelKart_Customers.xlsx')}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-xl transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>Customers (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => handleDownloadExcel(adminAPI.exportRevenue, 'HostelKart_Revenue.xlsx')}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 rounded-xl transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>Revenue (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {/* Import New Products Card */}
                <div className="space-y-2 border-l border-slate-150 pl-0 md:pl-6">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    Bulk Import Products
                  </h4>
                  <div className="relative">
                    <input
                      type="file"
                      id="import-excel-file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => handleExcelImport(e, 'import-products')}
                    />
                    <label
                      htmlFor="import-excel-file"
                      className="btn-secondary w-full py-2 text-xs flex items-center justify-center space-x-2 cursor-pointer rounded-xl bg-slate-50"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Choose Products Sheet (.xlsx)</span>
                    </label>
                  </div>
                </div>

                {/* Bulk Update Stock/Prices */}
                <div className="space-y-2 border-l border-slate-150 pl-0 lg:pl-6">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
                    Bulk Update Inventory Stocks
                  </h4>
                  <div className="relative">
                    <input
                      type="file"
                      id="inventory-excel-file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => handleExcelImport(e, 'bulk-inventory')}
                    />
                    <label
                      htmlFor="inventory-excel-file"
                      className="btn-secondary w-full py-2 text-xs flex items-center justify-center space-x-2 cursor-pointer rounded-xl bg-slate-50"
                    >
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <span>Choose Inventory Sheet (.xlsx)</span>
                    </label>
                  </div>
                </div>

              </div>
            </div>

            {/* Virtualized Products List Grid */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Products Catalog ({products.length} Items)</h3>
                <span className="text-[10px] text-slate-400 italic">DOM Virtualized viewport activated</span>
              </div>
              <VirtualizedTable
                items={products}
                rowHeight={72}
                viewportHeight={480}
                header={productTableHeader}
                renderRow={renderProductRow}
                className="shadow-md"
              />
            </div>

          </div>
        )}

        {/* ==================== TAB 2: AUDIT LOGS ==================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Admin Audit Action Logs ({logs.length} entries)</h3>
                <p className="text-[10px] text-slate-450">Automatic activity logger captures POST, PUT, DELETE write endpoint operations</p>
              </div>
              <button onClick={fetchLogs} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-650 flex items-center gap-1.5 transition-colors">
                <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
                Refresh Logs
              </button>
            </div>

            {logsLoading ? (
              <div className="p-12 animate-pulse space-y-4 bg-white border border-slate-100 rounded-2xl">
                <div className="h-6 bg-slate-100 rounded w-1/4"></div>
                <div className="h-48 bg-slate-50 rounded"></div>
              </div>
            ) : (
              <VirtualizedTable
                items={logs}
                rowHeight={60}
                viewportHeight={520}
                header={logsTableHeader}
                renderRow={renderLogRow}
                className="shadow-md"
              />
            )}
          </div>
        )}

        {/* ==================== TAB 3: ANALYTICS ==================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {analyticsLoading ? (
              <div className="p-12 animate-pulse space-y-6 bg-white border border-slate-100 rounded-2xl">
                <div className="h-8 bg-slate-100 rounded w-1/3"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="h-32 bg-slate-50 rounded-2xl"></div>
                  <div className="h-32 bg-slate-50 rounded-2xl"></div>
                  <div className="h-32 bg-slate-50 rounded-2xl"></div>
                </div>
              </div>
            ) : (
              <>
                {/* High-level Counters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
                    <span className="text-xl font-extrabold text-slate-800 block">₹{analytics?.todayRevenue || 0}</span>
                  </div>
                  <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Today's Orders</span>
                    <span className="text-xl font-extrabold text-slate-800 block">{analytics?.todayOrders || 0} Orders</span>
                  </div>
                  <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pending Orders</span>
                    <span className="text-xl font-extrabold text-amber-600 block">{analytics?.pendingOrders || 0} Orders</span>
                  </div>
                  <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Low Stock Items</span>
                    <span className="text-xl font-extrabold text-red-500 block">{analytics?.lowStockProductsCount || 0} Products</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Search Analytics Card */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-50 pb-2">
                      <SearchIcon className="w-5 h-5 text-primary-600" />
                      <h3 className="text-sm font-extrabold uppercase tracking-wide">Campus Search Analytics</h3>
                    </div>

                    <p className="text-xs text-slate-450 font-medium">Most searched keywords and student intents captured in real time</p>
                    
                    {trendingKeywords.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No search keyword activities logged yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {trendingKeywords.map((kw, i) => (
                          <div key={kw._id || i} className="flex justify-between items-center py-2 border-b border-slate-50 text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="text-slate-350">#{i+1}</span>
                              {kw.keyword}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-[10px] text-slate-500 font-bold rounded-lg">{kw.count} queries</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recommendation Click-Throughs & Top Products */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-slate-800 border-b border-slate-50 pb-2">
                      <BarChart2 className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-extrabold uppercase tracking-wide">Top Selling Campus Products</h3>
                    </div>

                    <p className="text-xs text-slate-455 font-medium">Top products flying off shelves ordered by hostel room students</p>

                    <div className="space-y-3">
                      {analytics?.topSelling?.map((p, i) => (
                        <div key={p._id || i} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>{p.name || 'Fallback Product'}</span>
                            <span>{p.totalQty || 0} units (₹{p.revenue || 0})</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, (p.totalQty / 20) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Low stock notifications */}
                {analytics?.lowStockProductsList?.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2.5">
                    <div className="flex items-center space-x-2 text-red-800">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Critical Inventory Alert (Stock &lt; 10)</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {analytics.lowStockProductsList.map(p => (
                        <div key={p._id} className="p-2 bg-white rounded-xl border border-red-100 flex items-center justify-between text-[11px] font-bold">
                          <span className="truncate text-slate-750">{p.name}</span>
                          <span className="text-red-600 font-extrabold">{p.stock} left</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        )}

      </div>

      {/* Add / Edit Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1.5px] p-4 overflow-y-auto">
          <div className="relative bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-xl font-extrabold text-slate-800">
                {editMode ? 'Edit Product Details' : 'Add New Product item'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-650 text-lg font-bold">
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Product Name</label>
                <input
                  type="text"
                  className="input-field text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Discount (%)</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Product Category</label>
                <select
                  className="input-field text-sm bg-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Quantity Stock</label>
                <input
                  type="number"
                  className="input-field text-sm"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Delivery Time Frame</label>
                <input
                  type="text"
                  placeholder="e.g. 15-30 mins"
                  className="input-field text-sm"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="available"
                  className="w-4 h-4 text-primary-600 border-slate-200 rounded"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                />
                <label htmlFor="available" className="text-sm font-bold text-slate-750 select-none">
                  Available for Student Purchase
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                <textarea
                  rows={3}
                  className="input-field text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Product Image URL</label>
                <input
                  type="text"
                  placeholder="Paste online image URL (e.g., https://images.unsplash.com/...) or upload below"
                  className="input-field text-sm"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-600 block">Or Upload Product Image File</label>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-16 h-16 bg-slate-55 border border-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={getAdminThumbnail(image)} className="w-12 h-12 object-contain" alt="Preview" />
                  </div>

                  <div className="flex-1 w-full space-y-1">
                    <div className="relative">
                      <input
                        type="file"
                        id="image-file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                      <label
                        htmlFor="image-file"
                        className="btn-secondary py-2 px-4 text-xs flex items-center justify-center space-x-2 cursor-pointer w-fit"
                      >
                        <Upload size={14} />
                        <span>{uploading ? 'Uploading...' : 'Choose Image File'}</span>
                      </label>
                    </div>
                    {uploadError && (
                      <p className="text-[10px] text-red-500 font-medium flex items-center space-x-1">
                        <AlertCircle size={10} />
                        <span>{uploadError}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 btn-primary py-2.5 text-xs shadow-md"
                >
                  {editMode ? 'Save Specifications' : 'Add to Catalog'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary py-2.5 px-6 text-xs"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminProducts;
