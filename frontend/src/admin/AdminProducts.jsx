import React, { useState, useEffect } from 'react';
import { adminAPI, productAPI } from '../api';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Upload, AlertCircle } from 'lucide-react';
import { getAdminThumbnail } from '../utils/image';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

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

  return (
    <>
      <div className="space-y-6 p-6 animate-slide-up">
      {/* Header action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manage Catalog Products</h1>
          <p className="text-sm text-slate-500">Insert, update, delete, and restock college store inventory items</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn-primary flex items-center space-x-1.5 text-sm py-2 px-4 shadow-md">
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Action status message banner */}
      {alert.message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-2 text-sm ${
          alert.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Grid listing table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/4"></div>
            <div className="h-24 bg-slate-50 rounded"></div>
          </div>
        ) : products.length === 0 ? (
          <p className="text-slate-400 italic text-center py-12 text-sm">No products in inventory.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                  <th className="p-4">Item Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/30 transition-colors">
                    {/* Details Column */}
                    <td className="p-4 flex items-center space-x-3 max-w-sm">
                      <div className="w-12 h-12 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={getAdminThumbnail(p)}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          width={40}
                          height={40}
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getAdminThumbnail(null);
                          }}
                        />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-800 block truncate">{p.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate leading-none mt-1">{p.description}</span>
                      </div>
                    </td>

                    <td className="p-4">{p.category}</td>
                    
                    <td className="p-4 font-bold text-slate-800">₹{p.price}</td>
                    
                    <td className="p-4 font-bold text-red-500">{p.discount || 0}% OFF</td>
                    
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.stock <= 5 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {p.stock} Units
                      </span>
                    </td>

                    <td className="p-4">
                      {p.isAvailable && p.stock > 0 ? (
                        <span className="text-emerald-600 font-bold flex items-center space-x-1">
                          <CheckCircle2 size={12} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-red-500 font-bold flex items-center space-x-1">
                          <XCircle size={12} />
                          <span>Sold Out</span>
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Product title name */}
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

              {/* Price & Discount */}
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

              {/* Category selector */}
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

              {/* Stock count */}
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

              {/* Delivery time */}
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

              {/* Availability */}
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="available"
                  className="w-4 h-4 text-primary-600 border-slate-200 rounded"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                />
                <label htmlFor="available" className="text-sm font-bold text-slate-700 select-none">
                  Available for Student Purchase
                </label>
              </div>

              {/* Description */}
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

              {/* Product Image URL Input */}
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

              {/* Image Upload Input utilizing Multer */}
              <div className="sm:col-span-2 space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-600 block">Or Upload Product Image File</label>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {/* Preview container */}
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
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

              {/* Submit actions */}
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
