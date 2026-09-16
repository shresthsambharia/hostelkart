import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { 
  Building2, 
  Users, 
  Package, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Edit2,
  ExternalLink,
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

const AdminSuppliers = () => {
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'suppliers'
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedProductForReject, setSelectedProductForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Add Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessName: '',
    contactPerson: '',
    address: '',
    gstNumber: '',
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus, selectedSupplierFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, productsRes] = await Promise.all([
        adminAPI.getSuppliers(),
        adminAPI.getSupplierProducts({
          status: filterStatus === 'all' ? undefined : filterStatus,
          supplierId: selectedSupplierFilter === 'all' ? undefined : selectedSupplierFilter,
        }),
      ]);

      setSuppliers(suppliersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error('Failed to load supplier administration data:', err);
      setFeedback({ type: 'error', message: 'Failed to load supplier management data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (product) => {
    try {
      setActionLoading(true);
      await adminAPI.updateSupplierProductApproval(product._id, {
        approvalStatus: 'approved',
        isAvailable: true,
      });

      setFeedback({
        type: 'success',
        message: `Product "${product.name}" approved successfully and is now active for students!`,
      });

      fetchData();
    } catch (err) {
      console.error('Failed to approve product:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to approve product.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectProduct = async () => {
    if (!selectedProductForReject) return;
    try {
      setActionLoading(true);
      await adminAPI.updateSupplierProductApproval(selectedProductForReject._id, {
        approvalStatus: 'rejected',
        isAvailable: false,
        reason: rejectionReason,
      });

      setFeedback({
        type: 'success',
        message: `Product "${selectedProductForReject.name}" marked as rejected.`,
      });

      setShowRejectModal(false);
      setSelectedProductForReject(null);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      console.error('Failed to reject product:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reject product.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const payload = {
        name: supplierForm.name.trim(),
        email: supplierForm.email.trim(),
        password: supplierForm.password,
        phone: supplierForm.phone.trim(),
        supplierDetails: {
          businessName: supplierForm.businessName.trim(),
          contactPerson: supplierForm.contactPerson.trim(),
          address: supplierForm.address.trim(),
          gstNumber: supplierForm.gstNumber.trim(),
        },
      };

      await adminAPI.createSupplier(payload);

      setFeedback({
        type: 'success',
        message: `Supplier account for "${supplierForm.name}" created successfully!`,
      });

      setShowAddSupplierModal(false);
      setSupplierForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        businessName: '',
        contactPerson: '',
        address: '',
        gstNumber: '',
      });

      fetchData();
    } catch (err) {
      console.error('Failed to create supplier:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create supplier account.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term)) ||
      (p.supplier?.name && p.supplier.name.toLowerCase().includes(term)) ||
      (p.supplier?.supplierDetails?.businessName &&
        p.supplier.supplierDetails.businessName.toLowerCase().includes(term))
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.phone && s.phone.includes(term)) ||
      (s.supplierDetails?.businessName && s.supplierDetails.businessName.toLowerCase().includes(term))
    );
  });

  const pendingCount = products.filter((p) => p.approvalStatus === 'pending').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="text-emerald-600" />
            Supplier Management & Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage authorized suppliers, onboard new vendors, and review submitted catalog inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Add Supplier
          </button>
          <button
            onClick={fetchData}
            title="Refresh"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {feedback.message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback({ type: '', message: '' })} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => { setActiveTab('approvals'); setSearchTerm(''); }}
          className={`pb-3 font-black text-sm tracking-wide transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'approvals'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package size={18} />
          Product Approvals
          {pendingCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
          className={`pb-3 font-black text-sm tracking-wide transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={18} />
          Registered Suppliers ({suppliers.length})
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={activeTab === 'approvals' ? 'Search products, suppliers...' : 'Search supplier names, emails...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {activeTab === 'approvals' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="pending">Pending Approvals</option>
              <option value="approved">Approved Products</option>
              <option value="rejected">Rejected Products</option>
              <option value="all">All Approval States</option>
            </select>

            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[200px]"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.supplierDetails?.businessName || s.name || s.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm text-slate-500 font-medium">Fetching supplier data...</p>
        </div>
      ) : activeTab === 'approvals' ? (
        // Products Table
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-700">No products found</p>
              <p className="text-xs text-slate-400 mt-1">There are no supplier products matching the selected filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Price / Stock</th>
                    <th className="px-4 py-3">Approval Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredProducts.map((p) => {
                    const supplierName = p.supplier?.supplierDetails?.businessName || p.supplier?.name || 'Unknown Supplier';
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80'}
                              alt={p.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{p.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description || 'No description'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs">
                            <p className="font-bold text-slate-800">{supplierName}</p>
                            <p className="text-slate-400">{p.supplier?.email || ''}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-black text-slate-900">₹{p.price}</p>
                            <p className="text-xs text-slate-500">
                              Stock: <span className={p.stock > 0 ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>{p.stock}</span>
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {p.approvalStatus === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} /> Approved
                            </span>
                          )}
                          {p.approvalStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} /> Pending Review
                            </span>
                          )}
                          {p.approvalStatus === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle size={12} /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {p.approvalStatus !== 'approved' && (
                              <button
                                onClick={() => handleApproveProduct(p)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm disabled:opacity-50"
                              >
                                <Check size={14} /> Approve
                              </button>
                            )}
                            {p.approvalStatus !== 'rejected' && (
                              <button
                                onClick={() => {
                                  setSelectedProductForReject(p);
                                  setShowRejectModal(true);
                                }}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-rose-200 disabled:opacity-50"
                              >
                                <X size={14} /> Reject
                              </button>
                            )}
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
      ) : (
        // Suppliers Directory Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-700">No suppliers found</p>
              <p className="text-xs text-slate-400 mt-1">Add your first supplier account using the button above.</p>
            </div>
          ) : (
            filteredSuppliers.map((s) => {
              const safeName = s.name && s.name !== 'undefined' && s.name !== 'null' ? s.name : 'Supplier Account';
              const businessName = s.supplierDetails?.businessName || safeName;
              return (
                <div key={s._id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Supplier
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1.5">{businessName}</h3>
                        <p className="text-xs text-slate-500 font-medium">Rep: {safeName}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {s.isActive !== false ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{s.email}</span>
                      </div>
                      {s.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.supplierDetails?.address && (
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{s.supplierDetails.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Joined: {new Date(s.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => {
                        setSelectedSupplierFilter(s._id);
                        setActiveTab('approvals');
                        setFilterStatus('all');
                      }}
                      className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      View Products <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="text-emerald-600" />
                Register New Supplier Account
              </h2>
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Representative Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Business / Firm Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fresh Valley Farms"
                    value={supplierForm.businessName}
                    onChange={(e) => setSupplierForm({ ...supplierForm, businessName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="supplier@example.com"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={supplierForm.password}
                    onChange={(e) => setSupplierForm({ ...supplierForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={supplierForm.gstNumber}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Business Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Address, City, State"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <AlertCircle className="text-rose-600" />
                Reject Product Submission
              </h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to reject <strong className="text-slate-900">{selectedProductForReject?.name}</strong>?
              You can optionally provide a reason for the supplier.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Price too high, improper image, duplicate listing..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectProduct}
                disabled={actionLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliers;
