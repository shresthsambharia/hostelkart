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
  RefreshCw,
  DollarSign,
  TrendingUp,
  CreditCard,
  Percent,
  ShieldAlert,
  FileText
} from 'lucide-react';

const AdminSuppliers = () => {
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'suppliers' | 'payouts' | 'finance'
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [financeOverview, setFinanceOverview] = useState(null);
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

  // Commission Modal
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedSupplierForCommission, setSelectedSupplierForCommission] = useState(null);
  const [commissionRateInput, setCommissionRateInput] = useState('');

  // Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedSupplierForStatus, setSelectedSupplierForStatus] = useState(null);
  const [statusInput, setStatusInput] = useState('active');

  // Payout Generation Modal
  const [showCreatePayoutModal, setShowCreatePayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    supplierId: '',
    paymentMethod: 'UPI',
    notes: '',
  });

  // Mark Paid Modal
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayoutForPaid, setSelectedPayoutForPaid] = useState(null);
  const [utrInput, setUtrInput] = useState('');
  const [paidMethodInput, setPaidMethodInput] = useState('UPI');

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
      const [suppliersRes, productsRes, payoutsRes, financeRes] = await Promise.all([
        adminAPI.getSuppliers(),
        adminAPI.getSupplierProducts({
          status: filterStatus === 'all' ? undefined : filterStatus,
          supplierId: selectedSupplierFilter === 'all' ? undefined : selectedSupplierFilter,
        }),
        adminAPI.getSupplierPayouts({ limit: 50 }),
        adminAPI.getMarketplaceFinance(),
      ]);

      setSuppliers(suppliersRes.data || []);
      setProducts(productsRes.data || []);
      setPayouts(payoutsRes.data.payouts || []);
      setFinanceOverview(financeRes.data || null);
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

  const handleSaveCommission = async (e) => {
    e.preventDefault();
    if (!selectedSupplierForCommission) return;
    try {
      setActionLoading(true);
      const rate = commissionRateInput === '' ? null : Number(commissionRateInput);
      await adminAPI.updateSupplierCommission(selectedSupplierForCommission._id, rate);
      setFeedback({
        type: 'success',
        message: `Commission percentage updated for ${selectedSupplierForCommission.name}`,
      });
      setShowCommissionModal(false);
      fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update commission rate',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedSupplierForStatus) return;
    try {
      setActionLoading(true);
      await adminAPI.updateSupplierStatus(selectedSupplierForStatus._id, statusInput);
      setFeedback({
        type: 'success',
        message: `Supplier account status updated to ${statusInput}`,
      });
      setShowStatusModal(false);
      fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update supplier status',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePayoutBatch = async (e) => {
    e.preventDefault();
    if (!payoutForm.supplierId) return;
    try {
      setActionLoading(true);
      const res = await adminAPI.createSupplierPayout(payoutForm);
      setFeedback({
        type: 'success',
        message: `Payout batch ${res.data.payout?.payoutNumber || ''} created successfully!`,
      });
      setShowCreatePayoutModal(false);
      fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create payout batch. Ensure there are delivered unsettled items for this supplier.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmMarkPaid = async (e) => {
    e.preventDefault();
    if (!selectedPayoutForPaid) return;
    if (!utrInput.trim()) {
      alert('UTR / Transaction reference is required to mark as Paid');
      return;
    }
    try {
      setActionLoading(true);
      await adminAPI.updateSupplierPayoutStatus(selectedPayoutForPaid._id, {
        status: 'Paid',
        utrNumber: utrInput.trim(),
        paymentMethod: paidMethodInput,
      });
      setFeedback({
        type: 'success',
        message: 'Payout marked as Paid! UTR recorded and ledger debited.',
      });
      setShowMarkPaidModal(false);
      setSelectedPayoutForPaid(null);
      setUtrInput('');
      fetchData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update payout status',
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
            onClick={() => setShowCreatePayoutModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-colors"
          >
            <DollarSign size={16} />
            Generate Payout
          </button>
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
      <div className="flex flex-wrap border-b border-slate-200 gap-4 sm:gap-6">
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
        <button
          onClick={() => { setActiveTab('payouts'); setSearchTerm(''); }}
          className={`pb-3 font-black text-sm tracking-wide transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'payouts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign size={18} />
          Supplier Payouts ({payouts.length})
        </button>
        <button
          onClick={() => { setActiveTab('finance'); setSearchTerm(''); }}
          className={`pb-3 font-black text-sm tracking-wide transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'finance'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp size={18} />
          Marketplace Finance
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
      ) : activeTab === 'suppliers' ? (
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
              const commissionOverride = s.supplierDetails?.commissionPercentage;
              const status = s.supplierDetails?.status || 'active';

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
                      <button
                        onClick={() => {
                          setSelectedSupplierForStatus(s);
                          setStatusInput(status);
                          setShowStatusModal(true);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : status === 'suspended'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {status}
                      </button>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500">Commission Rate:</span>
                        <button
                          onClick={() => {
                            setSelectedSupplierForCommission(s);
                            setCommissionRateInput(commissionOverride !== undefined ? String(commissionOverride) : '');
                            setShowCommissionModal(true);
                          }}
                          className="font-black text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                        >
                          <Percent size={11} />
                          <span>{commissionOverride !== undefined ? `${commissionOverride}% (Override)` : 'Default (10%)'}</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{s.email}</span>
                      </div>
                      {s.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.supplierDetails?.upiId && (
                        <div className="flex items-center gap-2">
                          <CreditCard size={13} className="text-slate-400 shrink-0" />
                          <span className="text-indigo-600 font-bold truncate">UPI: {s.supplierDetails.upiId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setPayoutForm({ ...payoutForm, supplierId: s._id });
                        setShowCreatePayoutModal(true);
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <DollarSign size={13} />
                      <span>Payout Batch</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSupplierFilter(s._id);
                        setActiveTab('approvals');
                        setFilterStatus('all');
                      }}
                      className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      Products ({s.stats?.totalProducts || 0}) <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === 'payouts' ? (
        // Tab 3: Payouts Management
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-slate-800">Manual Supplier Settlement Payouts</h2>
              <p className="text-xs text-slate-500">Review payout batches, record UTR transaction references, and trigger ledger disbursements.</p>
            </div>
            <button
              onClick={() => setShowCreatePayoutModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={14} />
              <span>Create Payout Batch</span>
            </button>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <DollarSign size={36} className="mx-auto text-slate-300" />
              <p className="text-slate-600 text-sm font-bold">No payout records created yet.</p>
              <p className="text-xs text-slate-400">Click "Create Payout Batch" to calculate net payables for delivered order items.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Payout #</th>
                    <th className="pb-3">Supplier</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Gross Sales</th>
                    <th className="pb-3">Commission</th>
                    <th className="pb-3">Net Payable</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">UTR / Ref</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {payouts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60">
                      <td className="py-3 font-mono font-black text-indigo-600">
                        {p.payoutNumber || `PAY-${p._id.slice(-6).toUpperCase()}`}
                      </td>
                      <td className="py-3 font-bold text-slate-800">
                        {p.supplier?.supplierDetails?.businessName || p.supplier?.name || 'Supplier'}
                      </td>
                      <td className="py-3 text-slate-500 font-semibold">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-3 font-bold text-slate-800">₹{p.grossAmount}</td>
                      <td className="py-3 text-rose-600 font-semibold">-₹{p.commissionAmount}</td>
                      <td className="py-3 font-black text-emerald-600 text-sm">₹{p.netPayable}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-600 font-bold">
                        {p.utrNumber || <span className="text-slate-400 italic font-normal">Pending</span>}
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          p.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'Processing'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : p.status === 'Cancelled' || p.status === 'Failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {p.status !== 'Paid' && p.status !== 'Cancelled' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedPayoutForPaid(p);
                                setPaidMethodInput(p.paymentMethod || 'UPI');
                                setUtrInput(p.utrNumber || '');
                                setShowMarkPaidModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                              Mark Paid
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Tab 4: Marketplace Finance Overview
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Platform Delivered GMV</span>
              <div className="text-2xl font-black text-slate-900">
                ₹{(financeOverview?.summary?.platformGMV || 0).toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-slate-400">Total delivered order value</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Platform Commission</span>
              <div className="text-2xl font-black text-purple-700">
                ₹{(financeOverview?.summary?.totalPlatformCommission || 0).toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-purple-600">Net HostelKart marketplace revenue</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Pending Disbursable</span>
              <div className="text-2xl font-black text-amber-600">
                ₹{(financeOverview?.summary?.pendingPayoutsAmount || 0).toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-amber-700">Awaiting UPI/Bank execution</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Total Settled to Suppliers</span>
              <div className="text-2xl font-black text-emerald-600">
                ₹{(financeOverview?.summary?.settledPayoutsAmount || 0).toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-emerald-700">Disbursed with UTR reference</span>
            </div>
          </div>

          {financeOverview?.categoryStats && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Category GMV & Commission Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.entries(financeOverview.categoryStats).map(([catName, stats]) => (
                  <div key={catName} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-xs font-black text-slate-800 block truncate">{catName}</span>
                    <div className="text-base font-black text-indigo-900">₹{stats.gmv}</div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {stats.itemsSold} sold • Comm: ₹{stats.commission}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commission Override Modal */}
      {showCommissionModal && selectedSupplierForCommission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Percent className="text-purple-600" size={16} />
                <span>Supplier Commission Rate</span>
              </h3>
              <button onClick={() => setShowCommissionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCommission} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Commission Percentage (%) for {selectedSupplierForCommission.name}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Leave blank for platform default (10%)"
                  value={commissionRateInput}
                  onChange={(e) => setCommissionRateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Applies directly to all future orders containing products from this supplier.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow"
                >
                  {actionLoading ? 'Saving...' : 'Save Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && selectedSupplierForStatus && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="text-emerald-600" size={16} />
                <span>Supplier Account Status</span>
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Account Status
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="active">Active (Authorized)</option>
                  <option value="suspended">Suspended (Paused)</option>
                  <option value="pending_verification">Pending Verification</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow"
                >
                  {actionLoading ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Payout Modal */}
      {showCreatePayoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="text-indigo-600" />
                <span>Create Supplier Payout Batch</span>
              </h3>
              <button onClick={() => setShowCreatePayoutModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePayoutBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Select Supplier Partner *
                </label>
                <select
                  required
                  value={payoutForm.supplierId}
                  onChange={(e) => setPayoutForm({ ...payoutForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.supplierDetails?.businessName || s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Disbursement Method
                </label>
                <select
                  value={payoutForm.paymentMethod}
                  onChange={(e) => setPayoutForm({ ...payoutForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="UPI">UPI Transfer</option>
                  <option value="Bank Transfer">NEFT / IMPS Bank Transfer</option>
                  <option value="Cash">Manual Cash Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Notes / Internal Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional note..."
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreatePayoutModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow"
                >
                  {actionLoading ? 'Creating Batch...' : 'Generate Payout Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showMarkPaidModal && selectedPayoutForPaid && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" />
                <span>Mark Payout as Disbursed (Paid)</span>
              </h3>
              <button onClick={() => setShowMarkPaidModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1">
              <div><strong>Payout #:</strong> {selectedPayoutForPaid.payoutNumber}</div>
              <div><strong>Supplier:</strong> {selectedPayoutForPaid.supplier?.name}</div>
              <div className="text-emerald-700 font-bold text-sm">
                <strong>Net Payable:</strong> ₹{selectedPayoutForPaid.netPayable}
              </div>
              {selectedPayoutForPaid.bankDetailsSnapshot?.upiId && (
                <div>UPI ID: <strong className="text-indigo-600">{selectedPayoutForPaid.bankDetailsSnapshot.upiId}</strong></div>
              )}
            </div>

            <form onSubmit={handleConfirmMarkPaid} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paidMethodInput}
                  onChange={(e) => setPaidMethodInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UPI">UPI Transfer</option>
                  <option value="Bank Transfer">NEFT / IMPS Bank Transfer</option>
                  <option value="Cash">Manual Cash Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Bank UTR / Transaction Reference Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 423589123456 or UPI Reference ID"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  This reference will be visible to the supplier and recorded in the immutable Financial Ledger.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMarkPaidModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow"
                >
                  {actionLoading ? 'Recording...' : 'Confirm & Disburse'}
                </button>
              </div>
            </form>
          </div>
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
