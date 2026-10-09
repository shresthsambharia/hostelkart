import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierAPI } from '../api';
import {
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Clock,
  AlertCircle,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Store,
} from 'lucide-react';

const SupplierOnboarding = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [utr, setUtr] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResubmitForm, setShowResubmitForm] = useState(false);

  const fetchOnboardingData = async () => {
    setLoading(true);
    setError('');
    try {
      const [configRes, statusRes] = await Promise.all([
        supplierAPI.getOnboardingConfig(),
        supplierAPI.getOnboardingStatus(),
      ]);
      setConfig(configRes.data);
      setStatusData(statusRes.data);

      if (statusRes.data?.isUnlocked) {
        // Already unlocked
        setTimeout(() => {
          navigate('/supplier/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to load onboarding data:', err);
      setError(err.response?.data?.message || 'Failed to load onboarding status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const handleCopyUpi = () => {
    if (config?.upiId) {
      navigator.clipboard.writeText(config.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    const cleanUtr = utr.trim().toUpperCase();

    if (!cleanUtr) {
      setError('Please enter the UTR / Transaction Reference Number');
      return;
    }

    if (cleanUtr.length < 6 || cleanUtr.length > 30) {
      setError('UTR must be between 6 and 30 characters');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await supplierAPI.submitOnboardingPayment({ utr: cleanUtr });
      setSuccess(res.data.message || 'Payment submitted for verification!');
      setUtr('');
      setShowResubmitForm(false);
      fetchOnboardingData();
    } catch (err) {
      console.error('Failed to submit onboarding payment:', err);
      setError(err.response?.data?.message || 'Failed to submit payment verification request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Onboarding Information...
        </p>
      </div>
    );
  }

  const latestPayment = statusData?.latestPayment;
  const isPending = latestPayment?.status === 'pending';
  const isRejected = latestPayment?.status === 'rejected';
  const isApproved = statusData?.isUnlocked || latestPayment?.status === 'approved';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-purple-300">
            <Store size={14} />
            <span>Supplier Partner Portal</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white font-display">
            Complete Supplier Onboarding
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/80 font-medium max-w-xl">
            To activate your Supplier Dashboard and start listing products, please complete the mandatory ₹40 one-time onboarding payment.
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-start gap-2.5 animate-slide-down">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-bold flex items-start gap-2.5 animate-slide-down">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* STATE 1: APPROVED */}
      {isApproved && (
        <div className="bg-white border border-emerald-200 p-6 sm:p-8 rounded-3xl shadow-premium-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-800">
              Onboarding Approved!
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Your ₹40 onboarding payment has been verified by the Admin. Your Supplier Dashboard is now fully unlocked.
            </p>
          </div>
          <button
            onClick={() => navigate('/supplier/dashboard')}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition-all inline-flex items-center justify-center gap-2"
          >
            <span>Enter Supplier Dashboard</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* STATE 2: PENDING VERIFICATION */}
      {isPending && !isApproved && (
        <div className="bg-white border border-amber-200 p-6 sm:p-8 rounded-3xl shadow-premium-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <Clock size={24} className="animate-pulse" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-full mb-1">
                Verification Pending
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Payment Submitted for Verification
              </h2>
              <p className="text-xs text-slate-500">
                An Admin will verify your payment in the receiving account. Your dashboard will unlock once approved.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Submitted UTR</span>
              <span className="font-mono font-black text-slate-800 text-xs sm:text-sm">{latestPayment.utr}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Amount</span>
              <span className="font-black text-slate-800">₹{latestPayment.amount}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Submission Time</span>
              <span className="font-semibold text-slate-600">
                {new Date(latestPayment.submittedAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Verification Status</span>
              <span className="font-black text-amber-600 uppercase text-[11px]">Awaiting Admin Approval</span>
            </div>
          </div>

          <button
            onClick={fetchOnboardingData}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            <span>Check Approval Status</span>
          </button>
        </div>
      )}

      {/* STATE 3: REJECTED NOTIFICATION (Allows Resubmission) */}
      {isRejected && !showResubmitForm && !isApproved && (
        <div className="bg-white border border-rose-200 p-6 sm:p-8 rounded-3xl shadow-premium-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <XCircle size={24} />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider rounded-full mb-1">
                Payment Verification Failed
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Your ₹40 Onboarding Payment Could Not Be Verified
              </h2>
              <p className="text-xs text-slate-500">
                The reference number was not matched in the receiving account.
              </p>
            </div>
          </div>

          {latestPayment.rejectionReason && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs">
              <span className="font-bold text-rose-800 block mb-1">Admin Reason:</span>
              <p className="text-rose-700">{latestPayment.rejectionReason}</p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Previously Submitted UTR</span>
              <span className="font-mono font-black text-slate-800">{latestPayment.utr}</span>
            </div>
          </div>

          <button
            onClick={() => setShowResubmitForm(true)}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            <span>Submit Corrected UTR / Payment</span>
          </button>
        </div>
      )}

      {/* STATE 4: PAYMENT FORM (Shown initially or after clicking resubmit) */}
      {(!isPending || showResubmitForm) && !isApproved && (
        <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-3xl shadow-premium space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                <QrCode className="text-purple-600" size={20} />
                <span>Scan & Pay ₹40 Onboarding Fee</span>
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Pay using Google Pay, PhonePe, Paytm, BHIM or any UPI app.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-black uppercase block">One-Time Fee</span>
              <span className="text-xl sm:text-2xl font-black text-purple-700 font-display">₹40</span>
            </div>
          </div>

          {/* QR Code and UPI ID Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Payment QR */}
            <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center space-y-3">
              {config?.qrCodeUrl ? (
                <img
                  src={config.qrCodeUrl}
                  alt="HostelKart Supplier Onboarding Payment QR"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-2xl border border-white shadow-sm bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center">
                  <QrCode size={48} className="text-purple-600 mb-2" />
                  <span className="text-xs font-black text-slate-700">UPI Payment QR</span>
                  <span className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Pay directly to UPI ID below
                  </span>
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-500">
                Scan QR with any UPI App
              </span>
            </div>

            {/* UPI ID & Steps */}
            <div className="space-y-4">
              <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">
                  Official HostelKart UPI ID
                </span>
                <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-xl border border-purple-200/70">
                  <span className="font-mono font-black text-xs sm:text-sm text-slate-800 break-all">
                    {config?.upiId || 'hostelkart@upi'}
                  </span>
                  <button
                    onClick={handleCopyUpi}
                    className="p-2 hover:bg-purple-50 rounded-lg text-purple-700 transition-colors shrink-0"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
                {copied && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check size={12} /> Copied to clipboard!
                  </span>
                )}
              </div>

              {/* Instructions list */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Open your UPI app (GPay / PhonePe / Paytm) and scan the QR or pay ₹40 to the UPI ID.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Once the transaction succeeds, copy the <strong>12-digit UTR / Transaction ID</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Paste the UTR below and click <strong>Submit Payment for Verification</strong>.</span>
                </div>
              </div>
            </div>
          </div>

          {/* UTR Submission Form */}
          <form onSubmit={handleSubmitUtr} className="border-t border-slate-100 pt-6 space-y-4">
            <div>
              <label htmlFor="utr-input" className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                UTR / Transaction Reference Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="utr-input"
                  type="text"
                  required
                  placeholder="e.g. 427819284910"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 rounded-2xl text-xs sm:text-sm font-mono font-bold tracking-wider text-slate-800 transition-all outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                Enter the exact reference number provided by your payment app after completing the ₹40 transfer.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !utr.trim()}
                className="w-full sm:flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting UTR...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Submit Payment for Verification</span>
                  </>
                )}
              </button>

              {showResubmitForm && (
                <button
                  type="button"
                  onClick={() => setShowResubmitForm(false)}
                  className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Support Info Footer */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-slate-400 shrink-0" />
          <span>Need help with supplier onboarding payment?</span>
        </div>
        <span className="font-bold text-purple-600">support@hostelkart.online</span>
      </div>
    </div>
  );
};

export default SupplierOnboarding;
