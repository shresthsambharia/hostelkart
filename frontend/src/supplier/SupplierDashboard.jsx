import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supplierAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag, CheckCircle, Clock, AlertTriangle, XCircle,
  Package, DollarSign, TrendingUp, PlusCircle, ArrowRight,
  RefreshCw, ClipboardList, User, ShieldCheck
} from 'lucide-react';

const SupplierDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supplierAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load supplier dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = data?.metrics || {
    totalProducts: 0,
    approvedProducts: 0,
    pendingProducts: 0,
    rejectedProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalStockUnits: 0,
    totalStockValuation: 0,
    totalOrdersCount: 0,
    deliveredOrdersCount: 0,
    totalRevenue: 0,
    totalItemsSold: 0,
  };

  const displayName = (user?.name && user.name !== 'undefined' && user.name !== 'null')
    ? user.name
    : (user?.email ? user.email.split('@')[0] : 'Supplier Partner');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-premium border border-purple-500/20">
        <div className="absolute right-0 top-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                <span>Supplier Partner Portal</span>
              </span>
              {user?.supplierDetails?.businessName && (
                <span className="text-xs text-purple-200 font-bold">
                  • {user.supplierDetails.businessName}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {displayName}!
            </h1>
            <p className="text-xs text-slate-350 max-w-xl leading-relaxed font-semibold">
              Manage your hostel supply inventory, track real-time sales, monitor product approval statuses, and restock supplies seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={fetchDashboard}
              className="p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl transition-all border border-white/10 text-xs font-bold flex items-center gap-1.5"
              title="Refresh metrics"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/supplier/products?action=new"
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition-all font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5"
            >
              <PlusCircle size={15} />
              <span>Add Product</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Products</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">{metrics.totalProducts}</div>
          <div className="text-[10px] font-bold text-slate-400">Total catalog items submitted</div>
        </div>

        {/* Approved Products */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Approved & Active</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.approvedProducts}</div>
          <div className="text-[10px] font-bold text-emerald-700">Live in campus store</div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Pending Approvals</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.pendingProducts}</div>
          <div className="text-[10px] font-bold text-amber-700">Under admin review</div>
        </div>

        {/* Out of Stock / Low Stock */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Low / Out of Stock</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            {metrics.lowStockProducts + metrics.outOfStockProducts}
          </div>
          <div className="text-[10px] font-bold text-rose-700">
            {metrics.outOfStockProducts} out of stock • {metrics.lowStockProducts} low
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Units In Stock</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">{metrics.totalStockUnits}</div>
          <div className="text-[10px] font-bold text-slate-400">Available physical stock</div>
        </div>

        {/* Stock Valuation */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Inventory Valuation</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-700">₹{metrics.totalStockValuation.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-slate-400">Current stock total value</div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Supply Orders</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ClipboardList size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">{metrics.totalOrdersCount}</div>
          <div className="text-[10px] font-bold text-indigo-700">{metrics.deliveredOrdersCount} delivered to students</div>
        </div>

        {/* Total Revenue & Net Earnings */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Net Delivered Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">₹{(metrics.netEarningsDelivered || 0).toLocaleString()}</div>
          <div className="text-[10px] font-bold text-slate-400">
            Pending Payout: <strong className="text-amber-600">₹{(metrics.pendingPayableBalance || 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/supplier/products"
          className="p-5 bg-white border border-slate-100 rounded-3xl shadow-premium-sm hover:border-purple-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Product Catalog</h3>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Add new items, adjust stock, prices, and availability toggles.
          </p>
        </Link>

        <Link
          to="/supplier/orders"
          className="p-5 bg-white border border-slate-100 rounded-3xl shadow-premium-sm hover:border-purple-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardList size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Supply Orders</h3>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            View student orders containing your items and fulfillment stages.
          </p>
        </Link>

        <Link
          to="/supplier/finance"
          className="p-5 bg-white border border-slate-100 rounded-3xl shadow-premium-sm hover:border-purple-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Finance & Payouts</h3>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Track commissions, settlements, ledger entries, and statements.
          </p>
        </Link>

        <Link
          to="/supplier/profile"
          className="p-5 bg-white border border-slate-100 rounded-3xl shadow-premium-sm hover:border-purple-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <User size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Business & Bank</h3>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Update your business name, contact person, phone, and payout details.
          </p>
        </Link>
      </div>

      {/* Recent Products Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-premium p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-800">Recent Products</h2>
            <p className="text-xs text-slate-400 font-semibold">Latest products submitted to your catalog</p>
          </div>
          <Link
            to="/supplier/products"
            className="text-xs font-extrabold text-purple-600 hover:text-purple-700 uppercase tracking-wider flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {(!data?.recentProducts || data.recentProducts.length === 0) ? (
          <div className="text-center py-10 space-y-3">
            <ShoppingBag size={32} className="mx-auto text-slate-300" />
            <p className="text-slate-400 text-xs font-bold">No products in your catalog yet.</p>
            <Link
              to="/supplier/products?action=new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:bg-purple-700"
            >
              <PlusCircle size={14} />
              <span>Add First Product</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Stock</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {data.recentProducts.map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-800">{prod.name}</td>
                    <td className="py-3 font-semibold text-slate-500">{prod.category}</td>
                    <td className="py-3 font-black text-slate-800">₹{prod.price}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        prod.stock === 0
                          ? 'bg-rose-50 text-rose-700'
                          : prod.stock < 10
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {prod.stock} units
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        prod.approvalStatus === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : prod.approvalStatus === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {prod.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to="/supplier/products"
                        className="text-purple-600 hover:text-purple-700 font-bold text-xs hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;
