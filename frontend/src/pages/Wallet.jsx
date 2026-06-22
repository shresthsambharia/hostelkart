import React, { useState, useEffect } from 'react';
import { walletAPI } from '../api';
import { Wallet, ShieldCheck, Share2, Clipboard, ArrowUpRight, ArrowDownLeft, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const WalletPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const fetchWalletDetails = async () => {
    try {
      const res = await walletAPI.getDetails();
      setData(res.data);
      
      // Load user details from localStorage to get referral code
      const profile = JSON.parse(localStorage.getItem('userInfo') || '{}');
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading wallet details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const handleCopyLink = () => {
    if (!userProfile?.referralCode) return;
    const inviteLink = `${window.location.origin}/register?ref=${userProfile.referralCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletDetails();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const {
    walletBalance = 0,
    transactions = [],
    loyaltyLevel = 'Bronze',
    cashbackPercent = 1,
    deliveredOrdersCount = 0,
    totalCashbackEarned = 0
  } = data || {};

  // Loyalty rules
  // Bronze: 0-4 (1%) -> Silver: 5-14 (2%) -> Gold: 15-29 (3%) -> Platinum: 30+ (5%)
  let nextLevel = '';
  let ordersToNextLevel = 0;
  let progressPercent = 100;
  if (deliveredOrdersCount < 5) {
    nextLevel = 'Silver';
    ordersToNextLevel = 5 - deliveredOrdersCount;
    progressPercent = (deliveredOrdersCount / 5) * 100;
  } else if (deliveredOrdersCount < 15) {
    nextLevel = 'Gold';
    ordersToNextLevel = 15 - deliveredOrdersCount;
    progressPercent = ((deliveredOrdersCount - 5) / 10) * 100;
  } else if (deliveredOrdersCount < 30) {
    nextLevel = 'Platinum';
    ordersToNextLevel = 30 - deliveredOrdersCount;
    progressPercent = ((deliveredOrdersCount - 15) / 15) * 100;
  } else {
    nextLevel = 'Platinum (Max Level)';
    ordersToNextLevel = 0;
    progressPercent = 100;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="text-primary-600 w-7 h-7" />
            <span>My Wallet & Rewards</span>
          </h1>
          <p className="text-sm text-slate-500">Track your cashbacks, loyalty level status, and referrals</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition-all"
          title="Refresh Balance"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid: Balance Card + Loyalty Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-primary-600 to-emerald-600 text-white rounded-3xl p-6 shadow-xl shadow-primary-600/10 relative overflow-hidden flex flex-col justify-between min-h-[220px] transform hover:scale-[1.01] transition-all">
          {/* Abstract circles design */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-xs font-semibold tracking-wider text-white/80 uppercase">Wallet Balance</span>
              <div className="text-4xl font-black tracking-tight">₹{walletBalance.toFixed(2)}</div>
            </div>
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 mt-6 relative z-10 text-xs">
            <div>
              <div className="text-white/70">Loyalty level</div>
              <div className="font-extrabold text-sm flex items-center gap-1 mt-0.5">
                <Trophy className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>{loyaltyLevel} ({cashbackPercent}% CB)</span>
              </div>
            </div>
            <div>
              <div className="text-white/70">Total Cashback Earned</div>
              <div className="font-extrabold text-sm mt-0.5">₹{totalCashbackEarned.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Loyalty level progress card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-600" />
                <h2 className="font-extrabold text-slate-800 text-sm">Loyalty Level Program</h2>
              </div>
              <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                {loyaltyLevel}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Get direct cashback on every single order! Earn higher cashback rates as you complete more deliveries.
            </p>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>{deliveredOrdersCount} Orders Completed</span>
                {ordersToNextLevel > 0 ? (
                  <span>{ordersToNextLevel} more for {nextLevel}</span>
                ) : (
                  <span>Max Tier Reached!</span>
                )}
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-50 pt-3 mt-4">
            Tiers: Bronze (1%), Silver (2% @ 5 orders), Gold (3% @ 15 orders), Platinum (5% @ 30 orders).
          </div>
        </div>
      </div>

      {/* Refer & Earn section */}
      <div className="bg-gradient-to-r from-emerald-50 to-primary-50 border border-emerald-100 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-2">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Refer a Friend & Get ₹50!</span>
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Invite your friends to HostelKart using your custom link! When they complete their first order, both of you will receive <strong>₹50 cashback</strong> credited directly to your wallets!
          </p>
          <div className="pt-2">
            <Link to="/referrals" className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline">
              View Referral Dashboard &rarr;
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-emerald-100/50 shadow-sm space-y-3 flex flex-col justify-center items-center text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Referral Code</div>
          <div className="text-xl font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-xl tracking-wider select-all uppercase">
            {userProfile?.referralCode || 'HKART500'}
          </div>
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-4 rounded-xl text-xs shadow-sm transition-all"
          >
            {copied ? 'Copied!' : (
              <>
                <Share2 className="w-3.5 h-3.5" /> Copy Invite Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-slate-500" />
            <span>Transaction Logs ({transactions.length})</span>
          </h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Wallet className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-medium">No wallet transactions logged yet</p>
            <p className="text-xs text-slate-400">Cashback awards and wallet payments will log logs here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-bold">
                  <th className="py-3 px-5">Transaction Details</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  <th className="py-3 px-5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {transactions.map((tx) => {
                  const isDebit = tx.amount < 0 || tx.type === 'purchase';
                  const absAmount = Math.abs(tx.amount);
                  
                  return (
                    <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-slate-800">
                        {tx.description}
                      </td>
                      <td className="py-3.5 px-5 shrink-0">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          tx.type === 'cashback'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            : tx.type === 'referral'
                            ? 'bg-primary-50 border-primary-100 text-primary-600'
                            : tx.type === 'refund'
                            ? 'bg-blue-50 border-blue-100 text-blue-600'
                            : 'bg-slate-50 border-slate-100 text-slate-500'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-3.5 px-5 font-extrabold text-right text-sm ${isDebit ? 'text-slate-700' : 'text-emerald-600'}`}>
                        <span className="flex items-center justify-end gap-0.5">
                          {isDebit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          <span>₹{absAmount.toFixed(2)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right text-slate-400 text-[10px]">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at{' '}
                        {new Date(tx.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;
