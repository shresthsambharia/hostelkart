import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { HelpCircle, Check, X, ClipboardCheck, AlertCircle } from 'lucide-react';

const AdminCustomRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusAction, setStatusAction] = useState('Accepted'); // Accepted or Rejected
  const [adminFeedback, setAdminFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const { data } = await adminAPI.getAllCustomRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching custom suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenActionModal = (req, action) => {
    setSelectedRequest(req);
    setStatusAction(action);
    setAdminFeedback('');
    setModalOpen(true);
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    
    setSubmitting(true);
    setAlert({ type: '', message: '' });

    try {
      await adminAPI.updateCustomRequestStatus(
        selectedRequest._id,
        statusAction,
        adminFeedback
      );

      setAlert({
        type: 'success',
        message: `Custom request for "${selectedRequest.itemName}" was ${statusAction.toLowerCase()}`
      });

      setModalOpen(false);
      fetchRequests();
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Action failed'
      });
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
    <div className="space-y-6 p-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Custom Product Requests</h1>
        <p className="text-sm text-slate-500">Review student suggestions, specify estimated cost budgets, and reply with comments</p>
      </div>

      {/* Alert notice */}
      {alert.message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-2 text-sm ${
          alert.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Table grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 animate-pulse space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/4"></div>
            <div className="h-24 bg-slate-50 rounded"></div>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-slate-400 italic text-center py-12 text-sm">No custom item requests submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                  <th className="p-4">Student</th>
                  <th className="p-4">Hostel Address</th>
                  <th className="p-4">Requested Item Details</th>
                  <th className="p-4">Est. Budget</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Manager Feedback</th>
                  <th className="p-4 text-center">Approve / Reject</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/30 transition-colors">
                    {/* Student user info */}
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">{req.user?.name || 'Deleted User'}</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">📞 {req.user?.phone}</span>
                    </td>

                    {/* Address hostel */}
                    <td className="p-4">
                      <span className="font-bold text-slate-700 block">{req.user?.hostelDetails?.hostelName}</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">
                        Block {req.user?.hostelDetails?.block}, Room {req.user?.hostelDetails?.roomNumber}
                      </span>
                    </td>

                    {/* Item Details */}
                    <td className="p-4 max-w-xs">
                      <span className="font-bold text-slate-800 block">{req.itemName}</span>
                      <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">{req.description}</span>
                    </td>

                    {/* Budget */}
                    <td className="p-4 font-bold text-slate-800">
                      ₹{req.estimatedPrice || 'N/A'}
                    </td>

                    {/* Status badge */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>

                    {/* Admin comments feedback */}
                    <td className="p-4 italic text-slate-500">
                      {req.adminFeedback || 'No response logged'}
                    </td>

                    {/* Actions buttons */}
                    <td className="p-4 text-center">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenActionModal(req, 'Accepted')}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100 shadow-sm"
                            title="Accept request"
                          >
                            <Check size={14} className="stroke-[3]" />
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(req, 'Rejected')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded border border-red-100 shadow-sm"
                            title="Reject request"
                          >
                            <X size={14} className="stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Response details popup modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1.5px] p-4">
          <div className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center space-x-1.5">
                <ClipboardCheck size={18} className="text-primary-600" />
                <span>Submit Response Feedback</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">
                  You are marking request for <span className="font-bold text-slate-700">"{selectedRequest?.itemName}"</span> as{' '}
                  <span className={`font-bold uppercase ${statusAction === 'Accepted' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {statusAction}
                  </span>.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Feedback Message</label>
                <textarea
                  required
                  placeholder="e.g. This will be procured and delivered by evening, or we do not stock this category item."
                  rows={3}
                  className="input-field text-xs"
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary py-2 text-xs font-bold"
                >
                  {submitting ? 'Updating...' : 'Save and Send'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomRequests;
