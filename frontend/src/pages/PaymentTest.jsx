import React, { useState } from 'react';
import { paymentAPI } from '../api';

const PaymentTest = () => {
  const [amount, setAmount] = useState('100'); // in paise
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [checkoutOptions, setCheckoutOptions] = useState(null);

  const handleCreateOrder = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);
    setCheckoutOptions(null);

    try {
      console.log('[DEBUG-TEST-PAGE] Creating order for amount (paise):', amount);
      const { data } = await paymentAPI.createOrder(Number(amount));
      console.log('[DEBUG-TEST-PAGE] Backend Response:', data);
      setResponse(data);

      // Prepare standard checkout options
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'HostelKart Test',
        description: 'Test payment isolated',
        order_id: data.order_id || data.id,
        handler: function (res) {
          console.log('[DEBUG-TEST-PAGE] Payment Success Res:', res);
          alert('Payment Successful!\nPayment ID: ' + res.razorpay_payment_id);
        },
        prefill: {
          name: 'Test Student',
          email: 'test@hostelkart.com',
          contact: '9876543210'
        },
        theme: {
          color: '#4f46e5'
        }
      };
      setCheckoutOptions(options);
    } catch (err) {
      console.error('[DEBUG-TEST-PAGE] Order creation failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = () => {
    if (!checkoutOptions) return;
    console.log('[DEBUG-TEST-PAGE] Launching Razorpay with options:', checkoutOptions);
    const rzp = new window.Razorpay(checkoutOptions);
    rzp.on('payment.failed', function (res) {
      console.error('[DEBUG-TEST-PAGE] Payment Failed Res:', res);
      alert('Payment Failed: ' + res.error.description);
    });
    rzp.open();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">🧪 Razorpay Checkout Tester</h1>
          <p className="text-xs text-slate-500">Test Razorpay order creation and launch payments in isolation</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-650 block mb-1">Amount (Paise) - Min 100</label>
            <input
              type="number"
              className="input-field text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateOrder}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {loading ? 'Creating...' : 'Create Razorpay Order'}
            </button>

            {checkoutOptions && (
              <button
                onClick={handleOpenCheckout}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
              >
                Open Payment Modal
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 text-xs font-semibold leading-relaxed">
            ❌ Error: {error}
          </div>
        )}

        {response && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Backend Response JSON</h3>
            <pre className="bg-slate-900 text-slate-200 text-xs p-5 rounded-2xl overflow-x-auto font-mono border border-slate-800 leading-relaxed">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        {checkoutOptions && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Razorpay Options JSON</h3>
            <pre className="bg-slate-900 text-slate-200 text-xs p-5 rounded-2xl overflow-x-auto font-mono border border-slate-800 leading-relaxed">
              {JSON.stringify(checkoutOptions, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentTest;
