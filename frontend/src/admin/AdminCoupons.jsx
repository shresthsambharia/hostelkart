import React, { useState, useEffect } from 'react';
import { couponAPI } from '../api';
import { Tag, Plus, Edit2, Trash2, Save, X, ToggleLeft, ToggleRight, Calendar, Info, Percent, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form states
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [minimumOrderAmount, setMinimumOrderAmount] = useState(0);
  const [maximumDiscount, setMaximumDiscount] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState(100);
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [allowWalletCombination, setAllowWalletCombination] = useState(true);
  const [active, setActive] = useState(true);

  const fetchCoupons = async () => {
    try {
      const { data } = await couponAPI.adminGetAll();
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      setAlert({ type: 'error', message: 'Failed to load coupons' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const resetForm = () => {
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue(0);
    setMinimumOrderAmount(0);
    setMaximumDiscount(0);
    setExpiryDate('');
    setUsageLimit(100);
    setFirstOrderOnly(false);
    setAllowWalletCombination(true);
    setActive(true);
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleEditClick = (c) => {
    setIsEditing(true);
    setCurrentId(c._id);
    setCode(c.code);
    setDescription(c.description);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMinimumOrderAmount(c.minimumOrderAmount);
    setMaximumDiscount(c.maximumDiscount);
    // Format date for input: YYYY-MM-DD
    const dateStr = new Date(c.expiryDate).toISOString().split('T')[0];
    setExpiryDate(dateStr);
    setUsageLimit(c.usageLimit);
    setFirstOrderOnly(c.firstOrderOnly);
    setAllowWalletCombination(c.allowWalletCombination);
    setActive(c.active);
  };

  const handleStatusToggle = async (c) => {
    try {
      const { data } = await couponAPI.adminUpdate(c._id, { active: !c.active });
      setCoupons(coupons.map(item => item._id === c._id ? data : item));
      setAlert({ type: 'success', message: `Coupon ${c.code} status updated!` });
    } catch (error) {
      console.error('Error updating status:', error);
      setAlert({ type: 'error', message: 'Failed to toggle status' });
    }
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await couponAPI.adminDelete(id);
      setCoupons(coupons.filter(item => item._id !== id));
      setAlert({ type: 'success', message: 'Coupon deleted successfully' });
    } catch (error) {
      console.error('Error deleting coupon:', error);
      setAlert({ type: 'error', message: 'Failed to delete coupon' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert({ type: '', message: '' });

    const couponData = {
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountValue: Number(discountValue),
      minimumOrderAmount: Number(minimumOrderAmount),
      maximumDiscount: Number(maximumDiscount),
      expiryDate: new Date(expiryDate),
      usageLimit: Number(usageLimit),
      firstOrderOnly,
      allowWalletCombination,
      active
    };

    try {
      if (isEditing) {
        const { data } = await couponAPI.adminUpdate(currentId, couponData);
        setCoupons(coupons.map(item => item._id === currentId ? data : item));
        setAlert({ type: 'success', message: 'Coupon updated successfully!' });
      } else {
        const { data } = await couponAPI.adminCreate(couponData);
        setCoupons([data, ...coupons]);
        setAlert({ type: 'success', message: 'Coupon created successfully!' });
      }
      resetForm();
    } catch (error) {
      console.error('Error saving coupon:', error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to save coupon' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Tag className="text-primary-600 w-7 h-7" />
            <span>Coupon Engine Manager</span>
          </h1>
          <p className="text-sm text-slate-500">Create, edit, toggle and manage discount coupons for student checkouts</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              resetForm();
              setIsEditing(false);
              document.getElementById('coupon-form-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 transition-all text-sm w-full md:w-auto"
          >
            <Plus className="w-4 h-4" /> Add New Coupon
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {alert.message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-2 text-sm ${
          alert.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Grid Layout: Coupons List + Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coupons List (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-700 text-sm">Active & Configured Coupons ({coupons.length})</h2>
            </div>
            
            {coupons.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Tag className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No coupons configured yet</p>
                <p className="text-xs text-slate-400">Use the form to create your first discount code</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {coupons.map((c) => {
                  const isExpired = new Date(c.expiryDate) < new Date();
                  return (
                    <div key={c._id} className={`p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all hover:bg-slate-50/50 ${!c.active ? 'opacity-65' : ''}`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary-50 text-primary-700 font-extrabold text-xs px-2.5 py-1 rounded-md border border-primary-100 tracking-wider">
                            {c.code}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            {c.discountType === 'percentage' ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`}
                          </span>
                          {isExpired ? (
                            <span className="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded">Expired</span>
                          ) : !c.active ? (
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded">Inactive</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-1.5 py-0.5 rounded">Active</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-700">{c.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-slate-500">
                          <div>Min Order: <span className="font-semibold text-slate-700">₹{c.minimumOrderAmount}</span></div>
                          <div>Max Cap: <span className="font-semibold text-slate-700">{c.maximumDiscount > 0 ? `₹${c.maximumDiscount}` : 'None'}</span></div>
                          <div>Used: <span className="font-semibold text-slate-700">{c.usageCount} / {c.usageLimit}</span></div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(c.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="flex gap-4 text-[11px] font-medium text-slate-400 pt-1">
                          <span className={c.allowWalletCombination ? 'text-emerald-600' : 'text-orange-500'}>
                            {c.allowWalletCombination ? '✓ Wallet Combination Allowed' : '✗ No Wallet Combination'}
                          </span>
                          <span className={c.firstOrderOnly ? 'text-primary-600' : 'text-slate-400'}>
                            {c.firstOrderOnly ? '• First Order Only' : '• All Orders'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 border-t border-slate-100 pt-3 md:border-none md:pt-0 shrink-0">
                        <button
                          onClick={() => handleStatusToggle(c)}
                          title={c.active ? 'Disable Coupon' : 'Enable Coupon'}
                          className={`p-2 rounded-lg border transition-all ${
                            c.active
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {c.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleEditClick(c)}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
                          title="Edit Coupon"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(c._id)}
                          className="p-2 rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-300 transition-all"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Form Column (Right 1 column) */}
        <div id="coupon-form-section" className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Tag className="text-primary-600 w-4 h-4" />
                <span>{isEditing ? 'Edit Coupon Settings' : 'Create Custom Coupon'}</span>
              </h2>
              {isEditing && (
                <button
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLAT50, HOSTELNEW"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 font-extrabold uppercase tracking-widest text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Promo Description</label>
                <textarea
                  required
                  rows="2"
                  placeholder="Describe details: ₹50 discount on your first block orders"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Discount Value</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      {discountType === 'percentage' ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-8 pr-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={minimumOrderAmount}
                    onChange={(e) => setMinimumOrderAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Max Cap Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for unlimited"
                    value={maximumDiscount}
                    onChange={(e) => setMaximumDiscount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 font-semibold"
                  />
                </div>
              </div>

              {/* Expiry & Usage Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Usage Limit Count</label>
                  <input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 font-semibold"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2.5">
                {/* allowWalletCombination */}
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-semibold text-slate-700 text-xs">Allow Wallet Combination</div>
                    <div className="text-[10px] text-slate-400 leading-normal">Allows students to pay the remaining order total using wallet balances</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowWalletCombination}
                    onChange={(e) => setAllowWalletCombination(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500 h-4.5 w-4.5 border-slate-300"
                  />
                </label>

                <hr className="border-slate-200" />

                {/* firstOrderOnly */}
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-semibold text-slate-700 text-xs">First Order Only</div>
                    <div className="text-[10px] text-slate-400 leading-normal">Restrict discount validation to newly registered students' initial checkouts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={firstOrderOnly}
                    onChange={(e) => setFirstOrderOnly(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500 h-4.5 w-4.5 border-slate-300"
                  />
                </label>

                <hr className="border-slate-200" />

                {/* active */}
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="space-y-0.5 pr-2">
                    <div className="font-semibold text-slate-700 text-xs">Activate Promo Immediately</div>
                    <div className="text-[10px] text-slate-400 leading-normal">Publish this coupon to the backend engine to allow students to input and validate it</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500 h-4.5 w-4.5 border-slate-300"
                  />
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-primary-600/10 transition-all flex items-center justify-center gap-1.5 mt-2 text-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : isEditing ? 'Save Settings' : 'Create Coupon Code'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCoupons;
