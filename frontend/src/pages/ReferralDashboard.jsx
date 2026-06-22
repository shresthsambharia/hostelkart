import React, { useState, useEffect } from 'react';
import { walletAPI } from '../api';
import { Share2, Clipboard, Users, Trophy, Gift, ArrowRight, Sparkles } from 'lucide-react';

const ReferralDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const loadData = async () => {
    try {
      const res = await walletAPI.getDetails();
      setData(res.data);
      
      const profile = JSON.parse(localStorage.getItem('userInfo') || '{}');
      setUserInfo(profile);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyLink = () => {
    if (!userInfo?.referralCode) return;
    const inviteLink = `${window.location.origin}/register?ref=${userInfo.referralCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    if (!userInfo?.referralCode) return;
    navigator.clipboard.writeText(userInfo.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const {
    deliveredOrdersCount = 0,
    transactions = []
  } = data || {};

  // Count referral transactions
  const referralTxs = transactions.filter(t => t.type === 'referral');
  const referralEarnings = referralTxs.reduce((acc, t) => acc + t.amount, 0);
  const successfulInvites = referralTxs.filter(t => t.description.includes('referral cashback')).length; // referrer txs

  const inviteLink = userInfo?.referralCode ? `${window.location.origin}/register?ref=${userInfo.referralCode}` : '';

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Gift className="text-primary-600 w-7 h-7" />
          <span>Referral Rewards Program</span>
        </h1>
        <p className="text-sm text-slate-500">Invite friends and earn ₹50 cashback each on their first room delivery</p>
      </div>

      {/* Grid: Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-primary-50 p-3 rounded-2xl text-primary-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Successful Invites</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{successfulInvites}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referral Cashback Earned</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">₹{referralEarnings.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referral Reward Rate</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">₹50 / invite</div>
          </div>
        </div>
      </div>

      {/* Invite details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referral code copy */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h2 className="font-extrabold text-slate-800 text-sm">Your Referral Code</h2>
            <p className="text-xs text-slate-500">Share this code or registration link with friends.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Referral Code</span>
              <span className="font-black text-slate-800 mt-1 uppercase text-sm">{userInfo?.referralCode || 'HKART500'}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="bg-slate-50 hover:bg-slate-100 p-3 rounded-2xl border border-slate-100 text-slate-600 hover:text-slate-800 flex flex-col items-center justify-center text-center transition-all"
            >
              <Clipboard className="w-4 h-4 text-slate-400 mb-1" />
              <span className="text-[10px] font-bold">{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-2xl text-xs shadow-md shadow-primary-600/10 transition-all"
            >
              <Share2 className="w-4 h-4" /> {copied ? 'Invite Link Copied!' : 'Copy Unique Invite Link'}
            </button>
          </div>
        </div>

        {/* Steps to Earn */}
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between">
          <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
            <Sparkles className="w-4.5 h-4.5 text-amber-500 fill-amber-500 animate-pulse" />
            <span>How to claim your ₹50 reward</span>
          </h2>
          
          <div className="space-y-4 my-4">
            <div className="flex gap-3 text-xs items-start">
              <span className="bg-primary-100 text-primary-700 font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">1</span>
              <div>
                <div className="font-bold text-slate-700">Send Invite link</div>
                <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">Your friend signs up using your registration referral link.</p>
              </div>
            </div>

            <div className="flex gap-3 text-xs items-start">
              <span className="bg-primary-100 text-primary-700 font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">2</span>
              <div>
                <div className="font-bold text-slate-700">Friend Places Order</div>
                <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">They order snacks, beverages or essentials from HostelKart.</p>
              </div>
            </div>

            <div className="flex gap-3 text-xs items-start">
              <span className="bg-primary-100 text-primary-700 font-black rounded-lg w-5 h-5 flex items-center justify-center shrink-0">3</span>
              <div>
                <div className="font-bold text-slate-700">Order Reaches Delivered</div>
                <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">Once their order is successfully delivered by the rider, BOTH of you get ₹50 cashback instantly!</p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 italic">
            * Referral cashback rewards are credited only after the referred user's first order reaches Delivered status.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
