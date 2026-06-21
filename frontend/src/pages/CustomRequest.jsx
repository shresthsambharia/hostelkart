import React, { useState, useEffect } from 'react';
import { customRequestAPI } from '../api';
import { PlusCircle, ClipboardList, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const CustomRequest = () => {
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRequests = async () => {
    try {
      const { data } = await customRequestAPI.getMyRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching custom requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!itemName || !description) {
      setErrorMsg('Please enter both name and description');
      return;
    }

    setSubmitting(true);
    try {
      await customRequestAPI.create({
        itemName,
        description,
        estimatedPrice: Number(estimatedPrice) || 0
      });

      setSuccessMsg('Request submitted to store manager successfully!');
      setItemName('');
      setDescription('');
      setEstimatedPrice('');
      
      // Reload table list
      fetchRequests();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10 animate-slide-up">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Custom Item Requests</h1>
        <p className="text-sm text-slate-500">Need something from the market not listed in our catalog? Request it here!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-4 md:col-span-1">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2">
            <PlusCircle size={18} className="text-primary-600" />
            <span>New Request</span>
          </h3>

          {successMsg && (
            <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="itemName" className="text-xs font-semibold text-slate-600 block mb-1">Item Name</label>
              <input
                id="itemName"
                type="text"
                placeholder="e.g. Scientific Calculator"
                className="input-field text-sm"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="itemDetails" className="text-xs font-semibold text-slate-600 block mb-1">Item Details & Size</label>
              <textarea
                id="itemDetails"
                placeholder="e.g. Casio fx-991EX. Require black color."
                rows={3}
                className="input-field text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="estimatedPrice" className="text-xs font-semibold text-slate-600 block mb-1">Estimated Budget (₹)</label>
              <input
                id="estimatedPrice"
                type="number"
                placeholder="e.g. 1200"
                className="input-field text-sm"
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)}
              />
            </div>

            <button type="submit" disabled={submitting} className="w-full btn-primary py-2 text-xs">
              {submitting ? 'Submitting...' : 'Submit Suggestion'}
            </button>
          </form>
        </div>

        {/* Previous Requests Table list */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ClipboardList size={18} className="text-primary-600" />
            <span>My Custom Suggestions</span>
          </h3>

          {loading ? (
            <div className="animate-pulse bg-slate-50 h-40 rounded-xl"></div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-12">
              No suggestions logged yet. Submit a form to request custom room items.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold">
                    <th className="py-2.5">Item Name</th>
                    <th className="py-2.5">Est. Price</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Manager Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                  {requests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3">
                        <span className="font-bold text-slate-800 block">{req.itemName}</span>
                        <span className="text-slate-400 text-[10px] block">{req.description}</span>
                      </td>
                      <td className="py-3 font-bold text-slate-800">₹{req.estimatedPrice || 'N/A'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 italic text-slate-500">{req.adminFeedback || 'No review feedback yet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomRequest;
