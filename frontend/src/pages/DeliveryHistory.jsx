import React, { useState, useEffect } from 'react';
import { deliveryAPI } from '../api';
import { Calendar, Search, ArrowLeft, Eye, XCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const DeliveryHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Delivered'); // 'Delivered' vs 'Cancelled'
  
  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await deliveryAPI.getHistory();
        setHistory(data);
      } catch (error) {
        console.error('Error fetching delivery history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Filter history based on search query, date boundaries, and orderStatus tab
  const filteredHistory = history.filter((ord) => {
    const matchesTab = activeTab === 'Cancelled'
      ? ['Cancelled', 'Delivery Failed'].includes(ord.orderStatus)
      : ord.orderStatus === activeTab;
    
    // Search filter
    const searchLower = search.toLowerCase();
    const orderId = ord._id.toLowerCase();
    const studentName = (ord.user?.name || '').toLowerCase();
    const hostel = (ord.deliveryDetails?.hostelName || '').toLowerCase();
    const room = (ord.deliveryDetails?.roomNumber || '').toLowerCase();
    const matchesSearch = 
      searchLower === '' ||
      orderId.includes(searchLower) ||
      studentName.includes(searchLower) ||
      hostel.includes(searchLower) ||
      room.includes(searchLower);

    // Date range filter
    const orderDate = new Date(ord.createdAt);
    orderDate.setHours(0,0,0,0);
    const start = startDate ? new Date(startDate) : null;
    if (start) start.setHours(0,0,0,0);
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(0,0,0,0);
    
    const matchesDate = 
      (!start || orderDate >= start) &&
      (!end || orderDate <= end);

    return matchesTab && matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 p-6 animate-slide-up">
      {/* Heading */}
      <div className="flex items-center space-x-3">
        <Link to="/delivery/dashboard" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Delivery History</h1>
          <p className="text-sm text-slate-500">View and audit all your past room deliveries and cancellations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {['Delivered', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'Delivered' ? (
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 size={16} />
                <span>Delivered ({history.filter(o => o.orderStatus === 'Delivered').length})</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <XCircle size={16} />
                <span>Cancelled / Failed ({history.filter(o => ['Cancelled', 'Delivery Failed'].includes(o.orderStatus)).length})</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Search student, hostel, room, ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">From:</span>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">To:</span>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/4"></div>
            <div className="h-20 bg-slate-50 rounded"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-sm">
            No delivery history matching your current filter selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-450 font-bold bg-slate-50/50">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Delivery Address</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">{activeTab === 'Delivered' ? 'Delivery Date' : 'Cancellation Details'}</th>
                  <th className="p-4 text-center">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
                {filteredHistory.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/30 transition-colors">
                    {/* ID */}
                    <td className="p-4 font-mono font-bold text-slate-800">
                      #{ord._id.substring(12).toUpperCase()}
                    </td>
                    
                    {/* Student */}
                    <td className="p-4 font-bold text-slate-800">
                      {ord.user?.name || 'Deleted Student'}
                    </td>

                    {/* Address */}
                    <td className="p-4">
                      <span className="font-bold text-slate-700 block">{ord.deliveryDetails?.hostelName}</span>
                      <span className="text-[10px] text-slate-450 block font-semibold">
                        Block {ord.deliveryDetails?.block}, Room {ord.deliveryDetails?.roomNumber}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-extrabold text-slate-800">
                      ₹{ord.totalAmount}
                    </td>

                    {/* Payment */}
                    <td className="p-4">
                      <span className="font-bold">{ord.paymentMethod}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">{ord.paymentStatus}</span>
                    </td>

                    {/* Dates or Cancellation Reason */}
                    <td className="p-4 max-w-xs">
                      {activeTab === 'Delivered' ? (
                        <div className="space-y-1">
                          <span className="text-slate-800 font-bold block">
                            {ord.deliveredAt ? new Date(ord.deliveredAt).toLocaleDateString() : new Date(ord.updatedAt).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-slate-450 block">
                            Time: {ord.deliveredAt ? new Date(ord.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(ord.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-red-650 font-bold block italic truncate max-w-xs">
                            Reason: "{ord.cancellationReason || 'N/A'}"
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Cancelled on: {new Date(ord.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-4 text-center">
                      <Link
                        to={`/orders/track/${ord._id}`}
                        className="inline-flex p-1.5 bg-slate-100 hover:bg-primary-50 text-slate-600 hover:text-primary-600 rounded-lg transition-colors"
                        title="View tracking status page"
                      >
                        <Eye size={14} />
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

export default DeliveryHistory;
