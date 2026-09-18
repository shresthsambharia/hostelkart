import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supplierAPI } from '../api';
import {
  DollarSign, TrendingUp, CreditCard, Clock, CheckCircle2,
  AlertTriangle, FileText, ArrowRight, RefreshCw, Printer,
  X, Filter, Calendar, ShieldCheck, Building, Smartphone
} from 'lucide-react';

const SupplierFinance = () => {
  const [financeData, setFinanceData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('payouts');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');
  const [statementLoading, setStatementLoading] = useState(false);
  const [activeStatement, setActiveStatement] = useState(null);
  const [showStatementModal, setShowStatementModal] = useState(false);

  const fetchFinanceOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const [finRes, payRes, ledRes] = await Promise.all([
        supplierAPI.getFinance(),
        supplierAPI.getPayouts({ limit: 50 }),
        supplierAPI.getLedger({ limit: 50, type: ledgerTypeFilter !== 'all' ? ledgerTypeFilter : undefined }),
      ]);
      setFinanceData(finRes.data);
      setPayouts(payRes.data.payouts || []);
      setLedger(ledRes.data.entries || []);
    } catch (err) {
      console.error('Failed to load supplier finance:', err);
      setError(err.response?.data?.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceOverview();
  }, [ledgerTypeFilter]);

  const viewStatement = async (payoutId) => {
    setStatementLoading(true);
    try {
      const res = await supplierAPI.getStatement(payoutId);
      setActiveStatement(res.data.statement);
      setShowStatementModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate statement');
    } finally {
      setStatementLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
      case 'Settled':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Approved':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Eligible':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled':
      case 'Failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getLedgerTypeBadge = (type) => {
    switch (type) {
      case 'SALE':
        return 'bg-emerald-100 text-emerald-800';
      case 'COMMISSION':
        return 'bg-purple-100 text-purple-800';
      case 'PAYOUT':
        return 'bg-blue-100 text-blue-800';
      case 'ADJUSTMENT':
        return 'bg-amber-100 text-amber-800';
      case 'REFUND':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const metrics = financeData?.metrics || {
    totalDeliveredGross: 0,
    totalDeliveredCommission: 0,
    totalDeliveredPayable: 0,
    eligibleUnsettled: 0,
    processingSettlement: 0,
    settledAmount: 0,
    totalPaidOut: 0,
    pendingPayoutsTotal: 0,
    effectiveCommissionRate: 10,
  };

  const bankDetails = financeData?.bankDetails || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-premium border border-indigo-500/20">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                <span>Financial Ledger & Payouts</span>
              </span>
              <span className="text-xs text-indigo-200 font-bold">
                • Standard Commission: {metrics.effectiveCommissionRate}%
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Supplier Earnings & Settlements
            </h1>
            <p className="text-xs text-slate-350 max-w-xl leading-relaxed font-semibold">
              Track your delivered item earnings, HostelKart platform commissions, manual UPI/Bank settlements, and financial ledger logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={fetchFinanceOverview}
              className="p-2.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl transition-all border border-white/10 text-xs font-bold flex items-center gap-1.5"
              title="Refresh financial metrics"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/supplier/profile"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5"
            >
              <CreditCard size={15} />
              <span>Payout Settings</span>
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

      {/* 10-Day Overdue Settlement Alert Banner */}
      {metrics.overdueItemsCount > 0 && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-300 rounded-3xl text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-rose-900 uppercase tracking-wide">
                Settlement Overdue Alert ({metrics.overdueItemsCount} Items (&gt; 10 Days))
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                ₹{metrics.overduePayable?.toLocaleString()} is past the standard 10-day settlement window. Admin has been notified for Saturday QR batch settlement.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shrink-0">
            Overdue Priority
          </span>
        </div>
      )}

      {/* Saturday Cycle & QR Code Information Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Next Saturday Cycle */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-3xl border border-indigo-700/40 space-y-3">
          <div className="flex justify-between items-center text-indigo-300">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} /> Weekly Payout Day
            </span>
            <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-md font-black">
              Every Saturday
            </span>
          </div>
          <div>
            <div className="text-xl font-black text-white">
              {metrics.nextPayoutDate
                ? new Date(metrics.nextPayoutDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  })
                : 'Next Saturday'}
            </div>
            <p className="text-[11px] text-indigo-200 mt-1">
              Minimum payout threshold: <strong>₹{metrics.minPayoutThreshold || 500}</strong>
            </p>
          </div>
          <div className="text-[10px] text-slate-300 pt-1 border-t border-indigo-800">
            {metrics.isBelowThreshold ? (
              <span className="text-amber-300 font-bold">
                ⚠️ Balance (₹{metrics.eligibleUnsettled}) is below ₹{metrics.minPayoutThreshold || 500} threshold. It will roll over.
              </span>
            ) : (
              <span className="text-emerald-300 font-bold">
                ✅ Eligible balance will be batched this Saturday!
              </span>
            )}
          </div>
        </div>

        {/* UPI QR Code Status */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-3 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={13} className="text-emerald-600" /> Payout UPI QR
            </span>
            {metrics.myPayoutQr ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            ) : (
              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                Missing QR
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {metrics.myPayoutQr ? (
              <img
                src={metrics.myPayoutQr}
                alt="My Payout QR"
                className="w-12 h-12 rounded-xl object-contain border border-slate-200 p-0.5 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
            )}
            <div className="text-xs">
              <p className="font-extrabold text-slate-800">
                {bankDetails.upiId ? bankDetails.upiId : 'No UPI ID set'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {metrics.myPayoutQr ? 'Admin will scan this QR for manual payout.' : 'Upload QR in Profile to enable payouts.'}
              </p>
            </div>
          </div>
          <Link
            to="/supplier/profile"
            className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1"
          >
            <span>{metrics.myPayoutQr ? 'Manage Payout QR' : 'Upload QR Now'}</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {/* Financial Rules Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-indigo-600" /> Settlement Rules
            </span>
            <ul className="text-[11px] text-slate-600 space-y-1.5 mt-2 font-medium">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                <span>Commission deducted automatically per item rate</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>Max 10 days settlement window from delivery</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                <span>Admin enters UTR on manual bank/UPI transfer</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Net Delivered Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{metrics.totalDeliveredPayable.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-emerald-700">
            Gross ₹{metrics.totalDeliveredGross.toLocaleString()} - Comm. ₹{metrics.totalDeliveredCommission.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Pending Payout Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            ₹{metrics.eligibleUnsettled.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-amber-700">
            Delivered orders awaiting payout batch
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">In Processing Batch</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600">
            ₹{metrics.processingSettlement.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-blue-700">
            Admin batch in disbursement
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-premium-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Disbursed (Paid)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            ₹{metrics.totalPaidOut.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-slate-400">
            Completed settlements with UTR
          </div>
        </div>
      </div>

      {/* Linked Settlement Details Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-premium-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building size={24} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Payout Settlement Destination</h3>
            <p className="text-xs text-slate-500 font-semibold">
              {bankDetails.upiId ? (
                <span>UPI ID: <strong className="text-indigo-600">{bankDetails.upiId}</strong></span>
              ) : bankDetails.accountNumber ? (
                <span>Bank: <strong>{bankDetails.bankName || 'Bank'}</strong> • A/C: ••••{bankDetails.accountNumber.slice(-4)} • IFSC: {bankDetails.ifsc}</span>
              ) : (
                <span className="text-amber-600 font-bold">No bank/UPI details configured yet. Payouts cannot be disbursed.</span>
              )}
            </p>
          </div>
        </div>
        <Link
          to="/supplier/profile"
          className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0"
        >
          <span>Update Bank / UPI Details</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
          <button
            onClick={() => setActiveTab('payouts')}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'payouts'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Payout History ({payouts.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'ledger'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Financial Audit Ledger ({ledger.length})
          </button>
        </div>

        {/* Tab 1: Payouts List */}
        {activeTab === 'payouts' && (
          <div className="p-6">
            {payouts.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <DollarSign size={36} className="mx-auto text-slate-300" />
                <p className="text-slate-500 text-xs font-bold">No payout records generated yet.</p>
                <p className="text-slate-400 text-[11px]">When orders are delivered, admin will generate payout batches and settle via UPI/Bank.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Payout #</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Gross</th>
                      <th className="pb-3">Commission</th>
                      <th className="pb-3">Net Payable</th>
                      <th className="pb-3">Method</th>
                      <th className="pb-3">UTR / Ref</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Statement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {payouts.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-black text-indigo-600">
                          {p.payoutNumber || `PAY-${p._id.slice(-6).toUpperCase()}`}
                        </td>
                        <td className="py-3 text-slate-500 font-semibold">
                          {new Date(p.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 font-bold text-slate-800">₹{p.grossAmount}</td>
                        <td className="py-3 text-rose-600 font-semibold">-₹{p.commissionAmount}</td>
                        <td className="py-3 font-black text-emerald-600">₹{p.netPayable}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-600">
                          {p.utrNumber ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">
                              {p.utrNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${getStatusBadge(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => viewStatement(p._id)}
                            disabled={statementLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-black transition-colors"
                          >
                            <FileText size={12} />
                            <span>Statement</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Immutable Ledger */}
        {activeTab === 'ledger' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Filter Type:</span>
                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="SALE">SALE (Credits)</option>
                  <option value="COMMISSION">COMMISSION (Debits)</option>
                  <option value="PAYOUT">PAYOUT (Debits)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                  <option value="REFUND">REFUND</option>
                </select>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Showing {ledger.length} entries (Immutable Ledger)
              </span>
            </div>

            {ledger.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <FileText size={36} className="mx-auto text-slate-300" />
                <p className="text-slate-500 text-xs font-bold">No financial ledger entries recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3">Reference</th>
                      <th className="pb-3">Direction</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {ledger.map((entry) => (
                      <tr key={entry._id} className="hover:bg-slate-50/50">
                        <td className="py-3 text-slate-500 font-semibold">
                          {new Date(entry.createdAt).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${getLedgerTypeBadge(entry.type)}`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-3 text-slate-800 font-semibold max-w-xs truncate">
                          {entry.description || '-'}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-500">
                          {entry.reference ? `#${entry.reference.substring(0, 8)}` : '-'}
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] font-black ${entry.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {entry.direction}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-black ${entry.direction === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {entry.direction === 'CREDIT' ? '+' : '-'}₹{entry.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statement Print / Modal */}
      {showStatementModal && activeStatement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                <h3 className="font-extrabold text-sm">Settlement Payout Statement</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} />
                  <span>Print Statement</span>
                </button>
                <button
                  onClick={() => setShowStatementModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-800">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black text-indigo-900">HostelKart Marketplace</h1>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Settlement & Commission Disbursement Statement
                  </p>
                  <p className="text-xs text-slate-500">Hostel Campus Delivery & Marketplace Platform</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">{activeStatement.payoutNumber}</div>
                  <div className="text-xs text-slate-500 font-semibold">
                    Status: <strong className="text-emerald-700 uppercase">{activeStatement.status}</strong>
                  </div>
                  {activeStatement.paidAt && (
                    <div className="text-xs text-slate-500">
                      Disbursed: {new Date(activeStatement.paidAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Supplier Partner</span>
                  <div className="font-bold text-slate-900 text-sm mt-1">{activeStatement.supplier?.name}</div>
                  <div className="text-slate-600">{activeStatement.supplier?.email}</div>
                  <div className="text-slate-600">Phone: {activeStatement.supplier?.phone || '-'}</div>
                  {activeStatement.supplier?.gstin && <div>GSTIN: {activeStatement.supplier.gstin}</div>}
                  {activeStatement.supplier?.panNumber && <div>PAN: {activeStatement.supplier.panNumber}</div>}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Disbursement Details</span>
                  <div className="font-bold text-slate-900 text-sm mt-1">
                    Method: {activeStatement.paymentMethod}
                  </div>
                  {activeStatement.utrNumber && (
                    <div className="text-slate-700">
                      <strong>UTR / Ref:</strong> {activeStatement.utrNumber}
                    </div>
                  )}
                  {activeStatement.bankDetailsSnapshot?.upiId && (
                    <div className="text-slate-600">UPI ID: {activeStatement.bankDetailsSnapshot.upiId}</div>
                  )}
                  {activeStatement.bankDetailsSnapshot?.accountNumber && (
                    <div className="text-slate-600">
                      A/C: {activeStatement.bankDetailsSnapshot.accountNumber} ({activeStatement.bankDetailsSnapshot.ifsc})
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Itemized Delivery Orders</h4>
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Gross</th>
                      <th className="p-2.5">Comm. Rate</th>
                      <th className="p-2.5">Comm. Amt</th>
                      <th className="p-2.5 text-right">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(activeStatement.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                        <td className="p-2.5 text-slate-600">{item.category}</td>
                        <td className="p-2.5 text-slate-800">{item.quantity}</td>
                        <td className="p-2.5 text-slate-800">₹{item.price}</td>
                        <td className="p-2.5 font-bold text-slate-900">₹{item.grossAmount}</td>
                        <td className="p-2.5 text-slate-600">{item.commissionRate}%</td>
                        <td className="p-2.5 text-rose-600 font-semibold">-₹{item.commissionAmount}</td>
                        <td className="p-2.5 text-right font-black text-emerald-700">₹{item.supplierPayableAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 pt-4 flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Gross Sales:</span>
                    <span className="font-bold">₹{activeStatement.grossAmount}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Platform Commission:</span>
                    <span className="font-bold">-₹{activeStatement.commissionAmount}</span>
                  </div>
                  {activeStatement.adjustments && activeStatement.adjustments.length > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Adjustments:</span>
                      <span className="font-bold">
                        ₹{activeStatement.adjustments.reduce((acc, a) => acc + (a.amount || 0), 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-indigo-900 border-t border-slate-200 pt-2">
                    <span>Net Disbursed:</span>
                    <span>₹{activeStatement.netPayable}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-400 text-center font-medium">
                This is a computer-generated settlement statement for HostelKart Supplier Marketplace.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierFinance;
