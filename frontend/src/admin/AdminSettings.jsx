import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { Settings, QrCode, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const AdminSettings = () => {
  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getPaymentSettings();
      setUpiId(data.upiId || '');
      setQrCodeUrl(data.qrCodeUrl || '');
    } catch (error) {
      console.error('Error fetching settings:', error);
      setAlert({ type: 'error', message: 'Failed to load payment settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    setAlert({ type: '', message: '' });

    try {
      const { data } = await adminAPI.uploadImage(formData);
      setQrCodeUrl(data.image);
      setAlert({ type: 'success', message: 'QR Code image uploaded successfully' });
    } catch (error) {
      console.error('Error uploading image:', error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to upload QR Code image' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert({ type: '', message: '' });

    try {
      await adminAPI.updatePaymentSettings({
        upiId,
        qrCodeUrl
      });
      setAlert({ type: 'success', message: 'Payment settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to save payment settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Generate a test dynamic UPI link for QR Code generator (Amount: ₹100 as a placeholder)
  const testUpiLink = `upi://pay?pa=${encodeURIComponent(upiId || 'test@upi')}&pn=HostelKart&am=100&cu=INR&tn=Test_Order`;
  const dynamicQrPreview = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(testUpiLink)}`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <Settings className="text-primary-600 w-7 h-7" />
          <span>Shop Settings</span>
        </h1>
        <p className="text-sm text-slate-500">Configure online UPI and QR Code payment accounts for room deliveries</p>
      </div>

      {/* Alert Banner */}
      {alert.message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-2 text-sm ${
          alert.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{alert.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form panel */}
        <form onSubmit={handleSubmit} className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-extrabold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <QrCode className="text-primary-600 w-5 h-5" />
            <span>UPI & QR Payment Config</span>
          </h3>

          <div className="space-y-4">
            {/* UPI ID */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">UPI ID (VPA)</label>
              <input
                type="text"
                placeholder="e.g. merchant@upi or 9876543210@paytm"
                className="input-field text-sm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Used to dynamically generate custom UPI QR codes for students at checkout containing order-specific amount and ID.
              </p>
            </div>

            {/* Custom Static QR Code URL */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Custom Static QR Code Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="URL of custom QR code (or upload below)"
                  className="input-field text-sm flex-1"
                  value={qrCodeUrl}
                  onChange={(e) => setQrCodeUrl(e.target.value)}
                />
              </div>

              {/* Upload field */}
              <div className="mt-3">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploading ? (
                        <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mb-2" />
                      ) : (
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      )}
                      <p className="text-xs text-slate-500 font-semibold">
                        {uploading ? 'Uploading QR Code image...' : 'Click to upload your QR scanner image'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">PNG, JPG or JPEG</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full btn-primary py-3 font-bold text-sm shadow-md flex items-center justify-center gap-1.5"
          >
            {saving && <RefreshCw size={14} className="animate-spin" />}
            <span>{saving ? 'Saving Config...' : 'Save Payment Configuration'}</span>
          </button>
        </form>

        {/* Live scanner preview card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Live Scanner Preview</span>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center relative w-48 h-48 shadow-inner">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Static Shop QR Code"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : upiId ? (
              <img
                src={dynamicQrPreview}
                alt="Dynamic UPI QR Code"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-slate-300 text-xs italic p-4">Enter UPI ID or upload QR code image to preview scanner</div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-sm">
              {qrCodeUrl ? 'Custom Shop Static QR' : 'Dynamic UPI QR Code'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed px-2">
              {qrCodeUrl 
                ? 'Displaying your uploaded static QR Code image.' 
                : `Scanning this will trigger a UPI request to "${upiId || 'test@upi'}" for ₹100.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
