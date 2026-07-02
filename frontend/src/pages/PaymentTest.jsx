import React, { useState } from 'react';
import { paymentAPI } from '../api';

const PaymentTest = () => {
  const [amount, setAmount] = useState('100'); // in rupees
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleCreateOrder = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      console.log('[DEBUG-TEST-PAGE] Creating Cashfree session for amount:', amount);
      const testOrderId = 'test_order_' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const { data } = await paymentAPI.createOrder(Number(amount), 'INR', testOrderId);
      console.log('[DEBUG-TEST-PAGE] Backend Response:', data);
      setResponse(data);
    } catch (err) {
      console.error('[DEBUG-TEST-PAGE] Session creation failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">🧪 Cashfree Checkout Tester</h1>
          <p className="text-xs text-slate-500">Test Cashfree order session creation in isolation</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-650 block mb-1">Amount (Rupees)</label>
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
              {loading ? 'Creating...' : 'Create Cashfree Session'}
            </button>
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
      </div>
    </div>
  );
};

export default PaymentTest;
