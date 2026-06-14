import React, { useState, useEffect } from 'react';

const PaymentDebug = () => {
  const [options, setOptions] = useState(null);

  useEffect(() => {
    const savedOptions = localStorage.getItem('last_razorpay_options');
    if (savedOptions) {
      try {
        setOptions(JSON.parse(savedOptions));
      } catch (err) {
        console.error('Failed to parse saved options:', err);
      }
    }
  }, []);

  const handleClear = () => {
    localStorage.removeItem('last_razorpay_options');
    setOptions(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">🔍 Razorpay Integration Debugger</h1>
            <p className="text-xs text-slate-500">Inspect the exact options payload dispatched to Checkout.js</p>
          </div>
          {options && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
            >
              Clear Logs
            </button>
          )}
        </div>

        {options ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Key ID</span>
                <span className="font-mono text-slate-800 break-all">{options.key}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Order ID</span>
                <span className="font-mono text-slate-800 break-all">{options.order_id || 'Not generated (simulated)'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Amount (Paise)</span>
                <span className="text-slate-800">{options.amount} (₹{options.amount / 100})</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Currency</span>
                <span className="text-slate-800">{options.currency}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Full Options JSON Payload</label>
              <pre className="bg-slate-900 text-slate-200 text-xs p-5 rounded-2xl overflow-x-auto font-mono leading-relaxed border border-slate-800">
                {JSON.stringify(options, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <p className="text-base font-bold">No checkout attempts logged yet.</p>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              Navigate to checkout, choose Online Payment, and click Place Order to capture the configurations payload.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDebug;
