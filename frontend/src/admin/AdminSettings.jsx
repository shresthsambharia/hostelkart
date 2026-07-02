import React, { useState, useEffect } from 'react';
import { adminAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  QrCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  Lock,
  X,
  Key,
  Download,
} from 'lucide-react';

const AdminSettings = () => {
  const { user, refreshProfile } = useAuth();

  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // 2FA state variables
  const [setupStep, setSetupStep] = useState('idle'); // idle, scan, recovery_codes
  const [secretText, setSecretText] = useState('');
  const [twoFactorQrUrl, setTwoFactorQrUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalAction, setModalAction] = useState(''); // disable, regenerate
  const [confirmPassword, setConfirmPassword] = useState('');

  const [setupError, setSetupError] = useState('');
  const [modalError, setModalError] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);

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

  const handleInitiate2FA = async () => {
    setSetupError('');
    try {
      const { data } = await authAPI.setup2FA({});
      setSecretText(data.secret);
      setTwoFactorQrUrl(data.qrCode);
      setSetupStep('scan');
    } catch (error) {
      console.error('Error initiating 2FA setup:', error);
      setSetupError(error.response?.data?.message || 'Failed to initiate 2FA setup');
    }
  };

  const handleVerifySetup = async () => {
    if (!verificationCode || verificationCode.trim().length !== 6) {
      setSetupError('Please enter a 6-digit code');
      return;
    }
    setVerifying(true);
    setSetupError('');
    try {
      const { data } = await authAPI.verify2FASetup({ code: verificationCode });
      setRecoveryCodes(data.recoveryCodes);
      setSetupStep('recovery_codes');
      await refreshProfile();
    } catch (error) {
      console.error('Error verifying 2FA setup:', error);
      setSetupError(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenPasswordModal = (action) => {
    setModalAction(action);
    setConfirmPassword('');
    setModalError('');
    setShowPasswordModal(true);
  };

  const handleConfirmPasswordAction = async (e) => {
    e.preventDefault();
    if (!confirmPassword) {
      setModalError('Password is required');
      return;
    }
    setSubmittingModal(true);
    setModalError('');
    try {
      if (modalAction === 'disable') {
        await authAPI.disable2FA({ password: confirmPassword });
        await refreshProfile();
        setShowPasswordModal(false);
        setSetupStep('idle');
        setAlert({ type: 'success', message: 'Two-factor authentication disabled successfully!' });
      } else if (modalAction === 'regenerate') {
        const { data } = await authAPI.setup2FA({ password: confirmPassword });
        setSecretText(data.secret);
        setTwoFactorQrUrl(data.qrCode);
        setSetupStep('scan');
        setVerificationCode('');
        setShowPasswordModal(false);
      }
    } catch (error) {
      console.error('Error in 2FA password confirmation:', error);
      setModalError(error.response?.data?.message || 'Verification failed');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secretText);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleDownloadRecoveryCodes = () => {
    const element = document.createElement("a");
    const file = new Blob([recoveryCodes.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "hostelkart_2fa_recovery_codes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
          <span>Settings & Security</span>
        </h1>
        <p className="text-sm text-slate-500">Configure online payment details and manage admin account security (2FA)</p>
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

      {/* Two-Factor Authentication (2FA) Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 mt-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            {user?.twoFactorEnabled ? (
              <ShieldCheck className="text-emerald-500 w-6 h-6" />
            ) : (
              <Shield className="text-slate-400 w-6 h-6" />
            )}
            <span>Two-Factor Authentication (2FA)</span>
          </h3>

          <div>
            {user?.twoFactorEnabled ? (
              <span className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-bold border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Enabled</span>
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full font-bold border border-slate-200">
                Disabled
              </span>
            )}
          </div>
        </div>

        {setupError && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{setupError}</span>
          </div>
        )}

        {/* 2FA SETUP STEPS */}
        {setupStep === 'idle' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              {user?.twoFactorEnabled
                ? 'Two-factor authentication (TOTP) is currently protecting your admin account. Every login attempt will require you to provide a 6-digit verification code from your registered authenticator device.'
                : 'Protect your admin account with an extra layer of security. When enabled, logging in will require both your password and a 6-digit verification code generated by your mobile authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.).'}
            </p>

            <div className="flex gap-3">
              {user?.twoFactorEnabled ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenPasswordModal('disable')}
                    className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                  >
                    Disable 2FA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPasswordModal('regenerate')}
                    className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} />
                    <span>Regenerate Keys</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleInitiate2FA}
                  className="btn-primary px-5 py-2.5 text-sm font-bold shadow-sm"
                >
                  Enable Two-Factor Authentication
                </button>
              )}
            </div>
          </div>
        )}

        {setupStep === 'scan' && (
          <div className="space-y-6 animate-slide-up">
            <p className="text-sm text-slate-500">
              Configure your authenticator app by scanning the QR code or manually typing the secret key.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* QR and Secret Column */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner space-y-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <img src={twoFactorQrUrl} alt="2FA QR Code" className="w-44 h-44" />
                </div>
                <div className="w-full space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                    Secret Key (Manual Entry)
                  </span>
                  <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                    <code className="text-xs font-mono font-bold text-slate-700 tracking-wider overflow-x-auto select-all max-w-[200px] md:max-w-none">
                      {secretText}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="text-slate-400 hover:text-primary-600 transition-colors shrink-0"
                      title="Copy Secret"
                    >
                      {copiedSecret ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions and Input Column */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Setup Instructions</h4>
                <ol className="text-xs text-slate-500 space-y-2 list-decimal list-inside pl-1">
                  <li>Open your authenticator app (e.g. Google Authenticator, Authy).</li>
                  <li>Choose to scan a QR code, or enter the secret key manually.</li>
                  <li>Scan the image on the left, or input the secret key.</li>
                  <li>Enter the generated 6-digit verification code below.</li>
                </ol>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-600 block">Verification Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      className="input-field text-center font-mono font-bold text-lg tracking-widest max-w-[140px]"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleVerifySetup}
                      disabled={verifying}
                      className="btn-primary px-4 py-2.5 text-sm font-bold shadow-sm flex-1 flex items-center justify-center gap-1.5"
                    >
                      {verifying && <RefreshCw size={14} className="animate-spin" />}
                      <span>{verifying ? 'Verifying...' : 'Verify & Enable'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSetupStep('idle')}
                    className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                  >
                    Cancel Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {setupStep === 'recovery_codes' && (
          <div className="space-y-6 animate-slide-up">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span className="font-bold">2FA Enabled Successfully!</span>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
              <h4 className="text-sm font-bold text-amber-800 flex items-center gap-1">
                <AlertCircle size={16} />
                <span>Save Recovery Codes</span>
              </h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                If you lose access to your authenticator app, these recovery codes are the <strong>ONLY</strong> way you can access your admin account. Store them in a password manager or write them down securely. Each code is <strong>one-time use only</strong>.
              </p>
            </div>

            {/* Recovery Codes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
              {recoveryCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="bg-white px-3 py-2 rounded-lg border border-slate-200 text-center font-mono font-bold text-sm text-slate-700 select-all"
                >
                  {code}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyRecoveryCodes}
                className="border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                {copiedCodes ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                <span>{copiedCodes ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadRecoveryCodes}
                className="border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Download size={16} />
                <span>Download as TXT</span>
              </button>
              <button
                type="button"
                onClick={() => setSetupStep('idle')}
                className="btn-primary px-5 py-2.5 text-sm font-bold shadow-md ml-auto"
              >
                Done (I've saved them)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PASSWORD CONFIRMATION MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Lock className="text-primary-600 w-5 h-5" />
                <span>Confirm Admin Password</span>
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              {modalAction === 'disable'
                ? 'For your security, please confirm your admin password to disable Two-Factor Authentication.'
                : 'Please confirm your admin password to regenerate your 2FA keys. Scanning a new QR code will be required, and your old authenticator device credentials will stop working.'}
            </p>

            <form onSubmit={handleConfirmPasswordAction} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  autoFocus
                  className="input-field text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submittingModal && <RefreshCw size={12} className="animate-spin" />}
                  <span>Verify & Proceed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
