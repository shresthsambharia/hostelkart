import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { IndianRupee, ShoppingCart, Clock, CheckCircle, Users, Package, ArrowRight, TrendingUp, Bike, ShieldCheck, AlertTriangle, Zap, LogOut, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Recharts imports for strict verification
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingStocks, setEditingStocks] = useState({});

  const fetchAnalytics = async () => {
    try {
      const { data } = await adminAPI.getAnalytics();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleUpdateStock = async (productId, newStock) => {
    try {
      await adminAPI.updateProduct(productId, { stock: newStock });
      const { data } = await adminAPI.getAnalytics();
      setStats(data);
      setEditingStocks(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } catch (error) {
      alert("Failed to update stock: " + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 bg-slate-50/50">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary-600 animate-spin"></div>
        </div>
        <p className="text-xs font-bold text-slate-500 animate-pulse">Analyzing Store Data...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="p-4 bg-red-50 text-red-500 rounded-2xl">
          <AlertTriangle size={36} className="animate-bounce" />
        </div>
        <h3 className="font-extrabold text-slate-800 text-base">Dashboard offline</h3>
        <p className="text-slate-500 text-xs max-w-xs leading-relaxed">Failed to load analytics. The server may be restarting or waking up.</p>
        <button onClick={fetchAnalytics} className="btn-primary py-2 px-5 text-xs font-bold rounded-xl shadow-md transition-all">
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = [
    { name: 'Total Revenue', value: `₹${stats.totalRevenue || 0}`, desc: "Lifetime platform sales", icon: <IndianRupee size={18} className="text-emerald-600" />, bg: 'bg-emerald-50 text-emerald-600', trend: "+12.4% MoM" },
    { name: 'Total Orders', value: stats.totalOrders || 0, desc: "Total orders processed", icon: <ShoppingCart size={18} className="text-blue-600" />, bg: 'bg-blue-50 text-blue-600', trend: "+8.2% MoM" },
    { name: 'Pending Orders', value: stats.pendingOrders || 0, desc: "Awaiting fulfillment", icon: <Clock size={18} className="text-amber-600" />, bg: 'bg-amber-50 text-amber-600', trend: "Action required" },
    { name: 'Delivered Orders', value: stats.deliveredOrders || 0, desc: "Successfully completed", icon: <CheckCircle size={18} className="text-teal-600" />, bg: 'bg-teal-50 text-teal-600', trend: "98.4% success" },
    { name: 'Registered Students', value: stats.totalUsers || 0, desc: "Active campus accounts", icon: <Users size={18} className="text-purple-600" />, bg: 'bg-purple-50 text-purple-600', trend: "+42 weekly" },
    { name: 'Total Catalog Products', value: stats.totalProducts || 0, desc: "Items currently active", icon: <Package size={18} className="text-slate-600" />, bg: 'bg-slate-50 text-slate-600', trend: "5 categories" },
  ];

  const renderSalesChart = () => {
    const data = stats.salesChartData || [];
    if (data.length === 0) return <p className="text-xs text-slate-400">No sales history yet.</p>;

    return (
      <div className="w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-premium flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight font-display">Revenue Trends</h3>
          <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">7-Day Transactional Flow</p>
        </div>
        <div className="w-full h-44 mt-4 font-semibold text-[9px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderOrderStatusChart = () => {
    const data = stats.orderStatusChartData || [];
    if (data.length === 0) return <p className="text-xs text-slate-400">No order logs yet.</p>;

    const COLORS = ['#f59e0b', '#3b82f6', '#6366f1', '#8b5cf6', '#10b981', '#ef4444'];

    return (
      <div className="w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-premium flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight font-display">Order Status Breakdown</h3>
          <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Current Distribution Metrics</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 items-center">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-36 font-semibold text-[8px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                <XAxis dataKey="status" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 pb-24 bg-slate-50/20">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display flex items-center gap-2">
            <span className="w-2.5 h-6 bg-primary-600 rounded-full block"></span>
            Enterprise Dashboard Control
          </h1>
          <p className="text-[11px] text-slate-455 font-bold uppercase mt-1">HostelKart Fulfillment & Sales Intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            className="btn-slate text-xs font-bold py-2 px-4 border border-slate-200 shadow-sm"
          >
            Refresh Metrics
          </button>
          <Link 
            to="/admin/orders" 
            className="btn-primary text-xs font-bold py-2 px-4 shadow-sm"
          >
            Fulfillment Queue
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div 
            key={kpi.name} 
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block truncate">{kpi.name}</span>
                <span className="text-lg font-black text-slate-900 block truncate">{kpi.value}</span>
              </div>
              <div className={`p-2 rounded-lg shrink-0 ${kpi.bg} shadow-sm`}>{kpi.icon}</div>
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-455 border-t border-slate-50 pt-2.5 mt-2.5">
              <span className="truncate">{kpi.desc}</span>
              <span className="text-emerald-650 shrink-0 font-black">{kpi.trend.includes("+") && kpi.trend}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Transactions details */}
      <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-premium space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <span>💳</span> Transaction Gateway Settlement
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Real-time payment logs, flow checks, and wallet disbursements</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-between min-h-[70px]">
            <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Completed</span>
            <span className="text-lg font-black text-emerald-650 block">{stats.successfulPayments || 0}</span>
          </div>
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-between min-h-[70px]">
            <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Failed</span>
            <span className="text-lg font-black text-rose-600 block">{stats.failedPayments || 0}</span>
          </div>
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-between min-h-[70px]">
            <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Pending Approval</span>
            <span className="text-lg font-black text-amber-600 block">{stats.pendingPayments || 0}</span>
          </div>
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-between min-h-[70px]">
            <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Refunded</span>
            <span className="text-lg font-black text-purple-600 block">{stats.refundedPayments || 0}</span>
          </div>
          <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-100/60 flex flex-col justify-between min-h-[70px]">
            <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Settled Gross</span>
            <span className="text-lg font-black text-blue-600 block">₹{stats.paymentRevenue || 0}</span>
          </div>
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex flex-col justify-between min-h-[70px]">
            <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Refund Outflow</span>
            <span className="text-lg font-black text-red-500 block">₹{stats.totalRefunds || 0}</span>
          </div>
        </div>
      </section>

      {/* Visual Analytics section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSalesChart()}
        {renderOrderStatusChart()}
      </section>

      {/* Primary Details Panel grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-premium space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Recent Storefront Orders</h3>
              <Link to="/admin/orders" className="text-[10px] font-bold text-primary-650 hover:underline flex items-center gap-0.5">
                <span>All Orders</span>
                <ArrowRight size={10} />
              </Link>
            </div>

            {stats.recentOrders.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-10 text-center font-medium">No order activity logged today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[450px]">
                  <thead>
                    <tr className="border-b border-slate-50 text-slate-400 font-bold">
                      <th className="py-2.5 px-2">Order ID</th>
                      <th className="py-2.5 px-2">Customer</th>
                      <th className="py-2.5 px-2">Campus Address</th>
                      <th className="py-2.5 px-2 text-right">Amount</th>
                      <th className="py-2.5 px-2 text-center">Fulfillment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                    {stats.recentOrders.map((ord) => (
                      <tr key={ord._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 font-mono font-bold text-slate-700">
                          #{ord._id.substring(12).toUpperCase()}
                        </td>
                        <td className="py-3 px-2 font-bold text-slate-800">{ord.user?.name || 'Guest User'}</td>
                        <td className="py-3 px-2">
                          <span className="block font-semibold">{ord.deliveryDetails?.hostelName}</span>
                          <span className="text-slate-400 text-[10px] block font-bold">Block {ord.deliveryDetails?.block}, Room {ord.deliveryDetails?.roomNumber}</span>
                        </td>
                        <td className="py-3 px-2 text-right font-extrabold text-slate-800">₹{ord.totalAmount}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                            ord.orderStatus === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-750 border-emerald-100'
                              : ord.orderStatus === 'Cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {ord.orderStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Spending Customers */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-premium space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Top Value Customers</h3>
            </div>
            {!stats.topCustomers || stats.topCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center font-medium">No customer spend logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 text-slate-400 font-bold">
                      <th className="py-2.5 px-2">Customer</th>
                      <th className="py-2.5 px-2">Email Contact</th>
                      <th className="py-2.5 px-2 text-center">Orders Placed</th>
                      <th className="py-2.5 px-2 text-right">Aggregate Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                    {stats.topCustomers.map((cust, idx) => (
                      <tr key={cust._id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 font-bold text-slate-800">{cust.name}</td>
                        <td className="py-3 px-2 text-slate-500 font-semibold">{cust.email}</td>
                        <td className="py-3 px-2 text-center text-slate-700 font-black">{cust.orderCount}</td>
                        <td className="py-3 px-2 text-right text-emerald-650 font-black">₹{cust.totalSpent.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Side panels for Low Stock Alerts & Top-Selling products */}
        <div className="space-y-6">
          
          {/* Low Stock alerts */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-premium space-y-4">
            <h3 className="font-extrabold text-rose-600 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <Package size={16} />
              <span>Inventory Threshold Alerts</span>
            </h3>

            {!stats.lowStockProductsList || stats.lowStockProductsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center font-medium">All warehouse stock levels normal.</p>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {stats.lowStockProductsList.map((prod) => {
                  const currentEditVal = editingStocks[prod._id] !== undefined ? editingStocks[prod._id] : prod.stock;
                  
                  return (
                    <div key={prod._id} className="flex justify-between items-center text-xs p-2.5 bg-rose-50/40 rounded-xl border border-rose-100/50 gap-2">
                      <div className="truncate min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{prod.name}</span>
                        <span className="text-slate-400 text-[10px] block truncate font-bold uppercase">{prod.category}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="text-right">
                          <span className="text-[8px] text-slate-455 block font-bold uppercase">Qty</span>
                          <span className={`font-black ${prod.stock === 0 ? 'text-red-650 animate-pulse' : 'text-rose-650'}`}>{prod.stock}</span>
                        </div>
                        <input
                           type="number"
                           min="0"
                           className="w-12 p-1 border border-slate-200 rounded-lg text-center font-bold text-slate-755 bg-white"
                           value={currentEditVal}
                           onChange={(e) => setEditingStocks({ ...editingStocks, [prod._id]: Number(e.target.value) })}
                        />
                        {editingStocks[prod._id] !== undefined && editingStocks[prod._id] !== prod.stock && (
                          <button
                            onClick={() => handleUpdateStock(prod._id, editingStocks[prod._id])}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded-lg text-[9px] shadow-sm transition-colors"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top selling products list */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-premium space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-primary-650 animate-bounce" />
              <span>High Velocity Essentials</span>
            </h3>

            <div className="space-y-4 pt-1">
              {stats.topSellingProducts.map((prod, idx) => {
                const maxQty = stats.topSellingProducts[0]?.totalQty || 1;
                const percentage = Math.round((prod.totalQty / maxQty) * 100) || 0;

                return (
                  <div key={prod._id || idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[130px]">{prod.name}</span>
                      <span className="text-slate-400 font-semibold">{prod.totalQty} sold (₹{prod.revenue})</span>
                    </div>
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                      <div
                        className="bg-primary-650 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
