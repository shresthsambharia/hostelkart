import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { IndianRupee, ShoppingCart, Clock, CheckCircle, Users, Package, ArrowRight, TrendingUp, Bike, ShieldCheck, AlertTriangle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      // reload stats
      const { data } = await adminAPI.getAnalytics();
      setStats(data);
      // reset specific edit state
      setEditingStocks(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      alert("Product stock updated successfully!");
    } catch (error) {
      alert("Failed to update stock: " + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const kpis = [
    { name: 'Total Revenue', value: `₹${stats.totalRevenue || 0}`, icon: <IndianRupee size={20} className="text-emerald-600" />, bg: 'bg-emerald-50' },
    { name: "Today's Revenue", value: `₹${stats.todayRevenue || 0}`, icon: <IndianRupee size={20} className="text-emerald-500" />, bg: 'bg-emerald-50/70' },
    { name: 'Total Orders', value: stats.totalOrders || 0, icon: <ShoppingCart size={20} className="text-blue-600" />, bg: 'bg-blue-50' },
    { name: "Today's Orders", value: stats.todayOrders || 0, icon: <ShoppingCart size={20} className="text-blue-500" />, bg: 'bg-blue-50/70' },
    { name: 'Pending Orders', value: stats.pendingOrders || 0, icon: <Clock size={20} className="text-amber-600" />, bg: 'bg-amber-50' },
    { name: 'Delivered Orders', value: stats.deliveredOrders || 0, icon: <CheckCircle size={20} className="text-teal-600" />, bg: 'bg-teal-50' },
    { name: 'Cancelled Orders', value: stats.cancelledOrders || 0, icon: <Clock size={20} className="text-red-650" />, bg: 'bg-red-50' },
    { name: 'Total Products', value: stats.totalProducts || 0, icon: <Package size={20} className="text-indigo-600" />, bg: 'bg-indigo-50' },
    { name: 'Low Stock Products', value: stats.lowStockProductsCount || 0, icon: <Package size={20} className="text-rose-600" />, bg: 'bg-rose-50' },
    { name: 'Registered Students', value: stats.totalUsers || 0, icon: <Users size={20} className="text-purple-600" />, bg: 'bg-purple-50' },
    { name: 'Delivery Partners', value: stats.totalDeliveryPartners || 0, icon: <Users size={20} className="text-violet-600" />, bg: 'bg-violet-50' },
  ];

  const renderSalesChart = () => {
    const data = stats.salesChartData || [];
    if (data.length === 0) return <p className="text-xs text-slate-400">No sales history yet.</p>;

    const maxVal = Math.max(...data.map(d => d.revenue), 100);
    const height = 160;
    const width = 500;
    const padding = 30;

    const points = data.map((d, i) => {
      const x = padding + (i * (width - 2 * padding)) / (data.length - 1);
      const y = height - padding - (d.revenue / maxVal) * (height - 2 * padding);
      return { x, y, label: d.label, val: d.revenue };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">7-Day Sales History</h3>
        <div className="relative w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
              const y = padding + p * (height - 2 * padding);
              return (
                <line
                  key={idx}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              );
            })}

            <path d={areaPath} fill="url(#chartGrad)" />
            <path d={linePath} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />

            {points.map((p, idx) => (
              <g key={idx}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#4f46e5"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="hover:r-6 transition-all cursor-pointer"
                />
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {p.label}
                </text>
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                  fontWeight="extrabold"
                >
                  ₹{p.val}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const renderOrderStatusChart = () => {
    const data = stats.orderStatusChartData || [];
    if (data.length === 0) return <p className="text-xs text-slate-400">No order logs yet.</p>;

    const maxVal = Math.max(...data.map(d => d.count), 1);

    const getBarColor = (status) => {
      switch (status) {
        case 'Pending': return 'bg-slate-400';
        case 'Confirmed': return 'bg-blue-500';
        case 'Packed': return 'bg-purple-500';
        case 'Out for Delivery': return 'bg-amber-500';
        case 'Delivered': return 'bg-emerald-500';
        case 'Cancelled': return 'bg-red-500';
        default: return 'bg-slate-350';
      }
    };

    return (
      <div className="w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Orders by Status</h3>
        <div className="space-y-3 pt-2">
          {data.map((item, idx) => {
            const percentage = Math.round((item.count / maxVal) * 100) || 0;
            return (
              <div key={item.status || idx} className="flex items-center space-x-3 text-xs">
                <span className="w-24 font-bold text-slate-600 truncate">{item.status}</span>
                <div className="flex-1 bg-slate-100 h-3.5 rounded-full overflow-hidden relative">
                  <div
                    className={`${getBarColor(item.status)} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="w-8 font-black text-slate-800 text-right">{item.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6 animate-slide-up">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Analytics Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of hostel essentials sales performance and operations</p>
      </div>

      {/* KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.name} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{kpi.name}</span>
              <span className="text-xl font-extrabold text-slate-800 block">{kpi.value}</span>
            </div>
            <div className={`p-3.5 rounded-xl shrink-0 ${kpi.bg}`}>{kpi.icon}</div>
          </div>
        ))}
      </section>

      {/* Payment Status Panel */}
      <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">💰 Payment Status Dashboard</h2>
          <p className="text-xs text-slate-500">Summary of successful, failed, pending, and refunded transactions</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
          {/* Successful Payments */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 flex flex-col justify-between space-y-2">
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Successful Payments</span>
            <span className="text-xl font-black text-emerald-800 block">{stats.successfulPayments || 0}</span>
          </div>

          {/* Failed Payments */}
          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/50 flex flex-col justify-between space-y-2">
            <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">Failed Payments</span>
            <span className="text-xl font-black text-rose-800 block">{stats.failedPayments || 0}</span>
          </div>

          {/* Pending Payments */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50 flex flex-col justify-between space-y-2">
            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">Pending Payments</span>
            <span className="text-xl font-black text-amber-800 block">{stats.pendingPayments || 0}</span>
          </div>

          {/* Refunded Payments */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/50 flex flex-col justify-between space-y-2">
            <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider block">Refunded Payments</span>
            <span className="text-xl font-black text-purple-800 block">{stats.refundedPayments || 0}</span>
          </div>

          {/* Total Revenue */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex flex-col justify-between space-y-2">
            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Total Revenue</span>
            <span className="text-xl font-black text-blue-800 block">₹{stats.paymentRevenue || 0}</span>
          </div>

          {/* Total Refunds */}
          <div className="bg-red-50/50 p-4 rounded-xl border border-red-100/50 flex flex-col justify-between space-y-2">
            <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block">Total Refunds</span>
            <span className="text-xl font-black text-red-800 block">₹{stats.totalRefunds || 0}</span>
          </div>
        </div>
      </section>

      {/* Charts section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderSalesChart()}
        {renderOrderStatusChart()}
      </section>

      {/* Delivery Operations Performance section */}
      <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Delivery Operations & Performance</h2>
          <p className="text-xs text-slate-500">Real-time rider logistics, completion speeds, and verification checks</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Deliveries */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Deliveries</span>
                <span className="text-2xl font-black text-slate-800">{stats.totalDeliveries || 0}</span>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                <Bike size={20} />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Completed today: <span className="font-extrabold text-slate-700">{stats.deliveriesToday || 0}</span>
            </div>
          </div>

          {/* Card 2: Average Speed */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Average Delivery Speed</span>
                <span className="text-2xl font-black text-slate-800">
                  {stats.averageDeliveryTime || 0} <span className="text-xs font-bold text-slate-500">mins</span>
                </span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
                <Zap size={20} />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              From confirmation to delivery timestamp
            </div>
          </div>

          {/* Card 3: OTP Verification Success Rate */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">OTP Verification Rate</span>
                <span className="text-2xl font-black text-slate-800">{stats.otpVerificationSuccessRate || 0}%</span>
              </div>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded gap-0.5">
                <ShieldCheck size={10} /> Secure Handoffs
              </span>
            </div>
            {/* Radial Gauge */}
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-150"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${stats.otpVerificationSuccessRate || 0}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700">
                {stats.otpVerificationSuccessRate || 0}%
              </div>
            </div>
          </div>

          {/* Card 4: Delivery Completion Ratio */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Fulfillment Ratio</span>
                <span className="text-xl font-extrabold text-slate-800">
                  {stats.successfulDeliveries || 0} <span className="text-xs text-slate-400 font-bold">vs</span> {stats.cancelledDeliveries || 0}
                </span>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
                <AlertTriangle size={20} />
              </div>
            </div>
            {/* Completion Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${
                      (stats.successfulDeliveries || 0) + (stats.cancelledDeliveries || 0) > 0
                        ? ((stats.successfulDeliveries || 0) / ((stats.successfulDeliveries || 0) + (stats.cancelledDeliveries || 0))) * 100
                        : 100
                    }%`
                  }}
                  title="Successful"
                ></div>
                <div
                  className="bg-red-500 h-full transition-all duration-500"
                  style={{
                    width: `${
                      (stats.successfulDeliveries || 0) + (stats.cancelledDeliveries || 0) > 0
                        ? ((stats.cancelledDeliveries || 0) / ((stats.successfulDeliveries || 0) + (stats.cancelledDeliveries || 0))) * 100
                        : 0
                    }%`
                  }}
                  title="Cancelled"
                ></div>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400">
                <span className="text-emerald-600 font-semibold">Success: {
                  (stats.successfulDeliveries || 0) + (stats.cancelledDeliveries || 0) > 0
                    ? Math.round(((stats.successfulDeliveries || 0) / ((stats.successfulDeliveries || 0) + (stats.cancelledDeliveries || 0))) * 100)
                    : 100
                }%</span>
                <span className="text-red-500 font-semibold">Cancel: {
                  (stats.successfulDeliveries || 0) + (stats.cancelledDeliveries || 0) > 0
                    ? Math.round(((stats.cancelledDeliveries || 0) / ((stats.successfulDeliveries || 0) + (stats.cancelledDeliveries || 0))) * 100)
                    : 0
                }%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent orders table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-base">Recent Room Orders</h3>
            <Link to="/admin/orders" className="text-xs font-bold text-primary-600 hover:underline flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-8 text-center">No orders registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="py-2.5">Order ID</th>
                    <th className="py-2.5">Student</th>
                    <th className="py-2.5">Hostel & Room</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                  {stats.recentOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono font-bold text-slate-700">
                        #{ord._id.substring(12).toUpperCase()}
                      </td>
                      <td className="py-3 font-bold text-slate-800">{ord.user?.name || 'Deleted User'}</td>
                      <td className="py-3">
                        <span className="block font-semibold">{ord.deliveryDetails?.hostelName}</span>
                        <span className="text-slate-400 text-[10px] block">Block {ord.deliveryDetails?.block}, Room {ord.deliveryDetails?.roomNumber}</span>
                      </td>
                      <td className="py-3 font-extrabold text-slate-800">₹{ord.totalAmount}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                          ord.orderStatus === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : ord.orderStatus === 'Cancelled'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-slate-100 text-slate-600'
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

        {/* Side panel for Low Stock and Top Selling */}
        <div className="space-y-6">
          
          {/* Low Stock alerts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-850 text-base border-b border-slate-100 pb-3 flex items-center space-x-1.5 text-rose-600">
              <Package size={18} />
              <span>Low Stock Alerts</span>
            </h3>

            {stats.lowStockProductsList && stats.lowStockProductsList.length === 0 ? (
              <p className="text-xs text-slate-450 italic py-6 text-center">No low stock items. All inventory levels healthy!</p>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {stats.lowStockProductsList && stats.lowStockProductsList.map((prod) => {
                  const currentEditVal = editingStocks[prod._id] !== undefined ? editingStocks[prod._id] : prod.stock;
                  
                  return (
                    <div key={prod._id} className="flex justify-between items-center text-xs p-2.5 bg-rose-50/50 rounded-xl border border-rose-100/50 gap-2">
                      <div className="truncate min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{prod.name}</span>
                        <span className="text-slate-400 text-[10px] block truncate">Category: {prod.category}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block font-semibold">Stock:</span>
                          <span className={`font-black ${prod.stock === 0 ? 'text-red-600 animate-pulse' : 'text-rose-600'}`}>{prod.stock}</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          className="w-12 p-1 border border-slate-200 rounded text-center font-bold text-slate-700 bg-white"
                          value={currentEditVal}
                          onChange={(e) => setEditingStocks({ ...editingStocks, [prod._id]: Number(e.target.value) })}
                        />
                        {editingStocks[prod._id] !== undefined && editingStocks[prod._id] !== prod.stock && (
                          <button
                            onClick={() => handleUpdateStock(prod._id, editingStocks[prod._id])}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-[10px] shadow-sm transition-colors"
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
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center space-x-1.5">
              <TrendingUp size={18} className="text-primary-600" />
              <span>Top-Selling Essentials</span>
            </h3>

            <div className="space-y-4 pt-1">
              {stats.topSellingProducts.map((prod, idx) => {
                const maxQty = stats.topSellingProducts[0]?.totalQty || 1;
                const percentage = Math.round((prod.totalQty / maxQty) * 100) || 0;

                return (
                  <div key={prod._id || idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[130px]">{prod.name}</span>
                      <span className="text-slate-400">{prod.totalQty} sold (₹{prod.revenue})</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary-600 h-full rounded-full transition-all duration-500"
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
