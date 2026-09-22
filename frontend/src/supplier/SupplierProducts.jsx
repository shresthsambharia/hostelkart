import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supplierAPI, adminAPI } from '../api';
import {
  ShoppingBag, Plus, Search, Filter, Edit2, Trash2,
  CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw,
  X, Check, Image as ImageIcon, Sparkles, Upload
} from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/image';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants';

const CATEGORIES = STUDENT_VISIBLE_CATEGORIES;

const SupplierProducts = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    mrp: '',
    category: 'Fruits',
    stock: '',
    brand: '',
    image: '',
    description: '',
  });

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchTerm) params.keyword = searchTerm;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (stockFilter !== 'all') params.stockFilter = stockFilter;

      const res = await supplierAPI.getProducts(params);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch supplier products:', err);
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, statusFilter, stockFilter]);

  // Handle URL query action=new
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      openCreateModal();
    }
  }, [location.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedProduct(null);
    setFormData({
      name: '',
      price: '',
      mrp: '',
      category: 'Fruits',
      stock: '',
      brand: '',
      image: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      price: product.price || '',
      mrp: product.mrp || '',
      category: product.category || 'Fruits',
      stock: product.stock !== undefined ? product.stock : '',
      brand: product.brand || '',
      image: product.image || '',
      description: product.description || '',
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    setUploadingImage(true);
    try {
      const res = await adminAPI.uploadImage(data);
      setFormData(prev => ({ ...prev, image: res.data.imageUrl || res.data }));
      setSuccess('Image uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Image upload failed:', err);
      setError(err.response?.data?.message || 'Image upload failed. You can paste an image URL instead.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (modalMode === 'create') {
        const res = await supplierAPI.createProduct(formData);
        setSuccess(res.data.message || 'Product submitted for admin review!');
      } else {
        const res = await supplierAPI.updateProduct(selectedProduct._id, formData);
        setSuccess(res.data.message || 'Product updated successfully!');
      }

      setIsModalOpen(false);
      fetchProducts();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to save product:', err);
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockUpdate = async (productId, newStock) => {
    const parsedStock = parseInt(newStock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) return;

    try {
      await supplierAPI.updateStock(productId, { stock: parsedStock });
      setProducts(prev => prev.map(p => p._id === productId ? { ...p, stock: parsedStock } : p));
      setSuccess('Stock updated!');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      console.error('Failed to update stock:', err);
      setError(err.response?.data?.message || 'Failed to update stock');
    }
  };

  const handleToggleAvailability = async (product) => {
    if (product.approvalStatus !== 'approved') {
      setError('Cannot activate product until approved by Admin.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const updatedAvail = !product.isAvailable;
      await supplierAPI.updateStock(product._id, { isAvailable: updatedAvail });
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isAvailable: updatedAvail } : p));
    } catch (err) {
      console.error('Failed to toggle availability:', err);
      setError(err.response?.data?.message || 'Failed to toggle availability');
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;

    try {
      await supplierAPI.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p._id !== productId));
      setSuccess('Product deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete product:', err);
      setError(err.response?.data?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-premium-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-purple-600" />
            <span>My Product Catalog</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Manage your hostel supply inventory, prices, stock quantities, and submission statuses.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all shrink-0"
        >
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-slide-down">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-bold flex items-center gap-2 animate-slide-down">
          <CheckCircle size={16} className="shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-premium-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 pl-10 pr-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </form>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Approval Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Approval</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Stock Level Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="in">In Stock (10+)</option>
              <option value="low">Low Stock (1-9)</option>
              <option value="out">Out of Stock (0)</option>
            </select>

            <button
              onClick={fetchProducts}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all text-xs font-bold flex items-center gap-1"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-purple-600" />
            <span>Loading product catalog...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag size={36} className="mx-auto text-slate-300" />
            <p className="text-slate-400 text-xs font-bold">No products found matching your filters.</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
            >
              Add First Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Item</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price / MRP</th>
                  <th className="p-4">Stock Quantity</th>
                  <th className="p-4">Approval Status</th>
                  <th className="p-4">Catalog Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {products.map((product) => {
                  const isPending = product.approvalStatus === 'pending';
                  const isApproved = product.approvalStatus === 'approved';
                  const isRejected = product.approvalStatus === 'rejected';

                  return (
                    <tr key={product._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Product details & thumbnail */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getOptimizedImageUrl(product.image, 48)}
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                          <div>
                            <p className="font-extrabold text-slate-800 text-xs">{product.name}</p>
                            {product.brand && (
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{product.brand}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4 font-bold text-slate-600">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px]">
                          {product.category}
                        </span>
                      </td>

                      {/* Price & MRP */}
                      <td className="p-4">
                        <div className="font-black text-slate-800 text-xs">₹{product.price}</div>
                        {product.mrp && product.mrp > product.price && (
                          <div className="text-[10px] text-slate-400 line-through">MRP: ₹{product.mrp}</div>
                        )}
                      </td>

                      {/* Quick stock editor */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            defaultValue={product.stock}
                            onBlur={(e) => handleStockUpdate(product._id, e.target.value)}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-xl py-1 px-2 text-xs font-black text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                            product.stock === 0
                              ? 'bg-rose-50 text-rose-700'
                              : product.stock < 10
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {product.stock === 0 ? 'Out' : product.stock < 10 ? 'Low' : 'OK'}
                          </span>
                        </div>
                      </td>

                      {/* Approval Status */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isApproved && <CheckCircle size={10} />}
                          {isPending && <Clock size={10} />}
                          {isRejected && <XCircle size={10} />}
                          <span>{product.approvalStatus}</span>
                        </span>
                      </td>

                      {/* Availability toggle */}
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(product)}
                          disabled={!isApproved}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                            !isApproved
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : product.isAvailable
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                          title={!isApproved ? 'Requires Admin Approval before enabling' : 'Toggle live availability'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${product.isAvailable ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
                          <span>{product.isAvailable ? 'Live' : 'Hidden'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                            title="Edit product"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id, product.name)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 my-8 animate-slide-down">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {modalMode === 'create' ? 'Add New Product to Catalog' : 'Edit Product'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  {modalMode === 'create' 
                    ? 'New products will be reviewed by admin before going live.' 
                    : 'Modifying price/name will resubmit for approval.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Red Apples (1kg pack)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Brand / Producer</label>
                  <input
                    type="text"
                    placeholder="e.g. Local Orchards"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 120"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* MRP */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">MRP Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 150"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Stock */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Initial Stock Units *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 50"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Image URL & File Upload */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">Product Image *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="https://... or upload below"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1 shrink-0">
                      <Upload size={14} />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  {formData.image && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <img src={getOptimizedImageUrl(formData.image, 40)} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                      <span className="text-[10px] font-mono text-slate-500 truncate">{formData.image}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Product Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide details about quality, freshness, weight, packaging..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>{modalMode === 'create' ? 'Submit Product' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierProducts;
