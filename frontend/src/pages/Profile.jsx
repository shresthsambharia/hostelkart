import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Phone,
  MapPin,
  Key,
  CheckCircle,
  ShoppingBag,
  ArrowRight,
  Shield,
  Bike,
  Landmark,
  ClipboardList,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Lock,
  X,
  Download,
  RefreshCw
} from 'lucide-react';
import { orderAPI, authAPI } from '../api';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, updateProfile, refreshProfile } = useAuth();

  // 2FA state variables
  const [setupStep, setSetupStep] = useState('idle'); // idle, scan, recovery_codes
  const [secretText, setSecretText] = useState('');
  const [twoFactorQrUrl, setTwoFactorQrUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [twoFactorConfirmPassword, setTwoFactorConfirmPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalAction, setModalAction] = useState(''); // disable, regenerate, regenerate_codes

  const [setupError, setSetupError] = useState('');
  const [modalError, setModalError] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address states
  const [hostelName, setHostelName] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      if (user.hostelDetails) {
        setHostelName(user.hostelDetails.hostelName || '');
        setBlock(user.hostelDetails.block || '');
        setFloor(user.hostelDetails.floor || '');
        setRoomNumber(user.hostelDetails.roomNumber || '');
        setAlternatePhone(user.hostelDetails.alternatePhone || '');
        setLandmark(user.hostelDetails.landmark || '');
        setDeliveryInstructions(user.hostelDetails.deliveryInstructions || '');
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchOrderCount = async () => {
      if (user && user.role === 'student') {
        try {
          const { data } = await orderAPI.getMyOrders();
          setOrderCount(data.length);
        } catch (err) {
          console.error("Failed to load orders for profile statistics", err);
        }
      }
    };
    fetchOrderCount();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password && password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const profileData = {
        name,
        phone,
      };

      if (user?.role === 'student') {
        profileData.hostelDetails = {
          hostelName,
          block,
          floor,
          roomNumber,
          alternatePhone,
          landmark,
          deliveryInstructions,
        };
      }

      if (password) {
        profileData.password = password;
      }

      const res = await updateProfile(profileData);
      if (res.success) {
        setSuccessMsg('Profile updated successfully!');
        setPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.message);
      }
    } catch (error) {
      setErrorMsg('An error occurred updating profile');
    } finally {
      setLoading(false);
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
    setTwoFactorConfirmPassword('');
    setModalError('');
    setShowPasswordModal(true);
  };

  const handleConfirmPasswordAction = async (e) => {
    e.preventDefault();
    if (!twoFactorConfirmPassword) {
      setModalError('Password is required');
      return;
    }
    setSubmittingModal(true);
    setModalError('');
    try {
      if (modalAction === 'disable') {
        await authAPI.disable2FA({ password: twoFactorConfirmPassword });
        await refreshProfile();
        setShowPasswordModal(false);
        setSetupStep('idle');
        setSuccessMsg('Two-factor authentication disabled successfully!');
      } else if (modalAction === 'regenerate') {
        const { data } = await authAPI.setup2FA({ password: twoFactorConfirmPassword });
        setSecretText(data.secret);
        setTwoFactorQrUrl(data.qrCode);
        setSetupStep('scan');
        setVerificationCode('');
        setShowPasswordModal(false);
      } else if (modalAction === 'regenerate_codes') {
        const { data } = await authAPI.regenerateRecoveryCodes({ password: twoFactorConfirmPassword });
        setRecoveryCodes(data.recoveryCodes);
        setSetupStep('recovery_codes');
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

  const getInitials = (userName) => {
    if (!userName) return 'HK';
    const parts = userName.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-24">
      {/* Premium Profile Header Dashboard */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-premium">
        {/* Background mesh glow */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-primary-500 to-emerald-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-white/10 shrink-0">
            {getInitials(user?.name)}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display">{user?.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                  user?.role === 'admin' 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                    : user?.role === 'delivery'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {user?.role} Portal
                </span>
              </div>
              <p className="text-slate-400 text-sm font-medium">{user?.email}</p>
            </div>

            {/* Quick access badge */}
            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start space-x-1.5 pt-1">
              <Shield size={12} className="text-emerald-400" />
              <span>Secure Session • {user?.role === 'student' ? 'Room Service Delivery' : 'Internal Ops Access'}</span>
            </p>
          </div>
        </div>

        {/* Quick statistics widgets for student */}
        {user?.role === 'student' && (
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 mt-6 pt-6 text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Orders</span>
              <span className="text-lg sm:text-xl font-black text-white mt-0.5 block">{orderCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hostel Block</span>
              <span className="text-lg sm:text-xl font-black text-white mt-0.5 block truncate">{block || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Room No</span>
              <span className="text-lg sm:text-xl font-black text-white mt-0.5 block">{roomNumber || 'N/A'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Navigation Shortcuts Grid */}
      <div className="space-y-3">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">QUICK OPERATION SHORTCUTS</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {user?.role === 'student' && (
            <>
              <Link 
                to="/myorders" 
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium hover:border-slate-200 transition-all font-semibold text-xs text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <ClipboardList size={16} className="text-primary-600" />
                  <span>My Orders</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link 
                to="/cart" 
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium hover:border-slate-200 transition-all font-semibold text-xs text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <ShoppingBag size={16} className="text-primary-600" />
                  <span>Shopping Cart</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link 
                to="/customrequest" 
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium hover:border-slate-200 transition-all font-semibold text-xs text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <Layers size={16} className="text-primary-600" />
                  <span>Custom Room Request</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
            </>
          )}

          {user?.role === 'delivery' && (
            <>
              <Link 
                to="/delivery/dashboard" 
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium hover:border-slate-200 transition-all font-semibold text-xs text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <Bike size={16} className="text-blue-600" />
                  <span>Delivery Dashboard</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link 
                to="/delivery/history" 
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium hover:border-slate-200 transition-all font-semibold text-xs text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <ClipboardList size={16} className="text-blue-600" />
                  <span>Delivery Logs History</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link 
                to="/admin/dashboard" 
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium hover:border-slate-200 transition-all font-semibold text-xs text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <Shield size={16} className="text-rose-600" />
                  <span>Analytics Control Center</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link 
                to="/admin/orders" 
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium hover:border-slate-200 transition-all font-semibold text-xs text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <ClipboardList size={16} className="text-rose-600" />
                  <span>Manage All Orders</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link 
                to="/admin/products" 
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium hover:border-slate-200 transition-all font-semibold text-xs text-slate-700"
              >
                <span className="flex items-center space-x-2">
                  <ShoppingBag size={16} className="text-rose-600" />
                  <span>Catalog Inventory</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl flex items-center space-x-2 text-sm">
          <CheckCircle className="w-5.5 h-5.5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center space-x-2 text-sm font-semibold">
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-premium space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center space-x-2">
            <User size={16} className="text-primary-600" />
            <span>Personal Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-650 block mb-1">Full Name</label>
              <input
                type="text"
                className="input-field text-sm font-semibold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-650 block mb-1">Email (ReadOnly)</label>
              <input
                type="text"
                className="input-field text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                value={user?.email || ''}
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-650 block mb-1">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  className="input-field text-sm pl-10 font-semibold"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Phone size={14} className="text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-650 block mb-1">Your Role (ReadOnly)</label>
              <input
                type="text"
                className="input-field text-sm bg-slate-50 text-slate-550 font-bold capitalize cursor-not-allowed"
                value={user?.role || ''}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Address Details (Student role only) */}
        {user?.role === 'student' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-premium space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center space-x-2">
              <MapPin size={16} className="text-primary-600" />
              <span>Hostel Address details (Default)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-650 block mb-1">Hostel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramanujan Hostel"
                  className="input-field text-sm font-semibold"
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-650 block mb-1">Block / Wing</label>
                <input
                  type="text"
                  placeholder="e.g. B-Block"
                  className="input-field text-sm font-semibold"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-650 block mb-1">Floor</label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Floor"
                  className="input-field text-sm font-semibold"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-650 block mb-1">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. 215"
                  className="input-field text-sm font-semibold"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-650 block mb-1">Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near the washroom / Opposite to staircase"
                  className="input-field text-sm font-semibold"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-650 block mb-1">Alternate Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  className="input-field text-sm font-semibold"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-650 block mb-1">Delivery Instructions</label>
                <textarea
                  placeholder="e.g. Call before coming up, leave outside if door locked"
                  rows={2}
                  className="input-field text-sm font-semibold"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Change password */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-premium space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center space-x-2">
            <Key size={16} className="text-primary-600" />
            <span>Change Password (Leave blank to keep current)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-650 block mb-1">New Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                className="input-field text-sm font-semibold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-650 block mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                className="input-field text-sm font-semibold"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        {user && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-premium space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center space-x-2">
                {user?.twoFactorEnabled ? (
                  <ShieldCheck className="text-emerald-500 w-4.5 h-4.5" />
                ) : (
                  <Shield className="text-slate-400 w-4.5 h-4.5" />
                )}
                <span>Security & Two-Factor Authentication (2FA)</span>
              </h3>

              <div>
                {user?.twoFactorEnabled ? (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Enabled</span>
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-slate-200">
                    Disabled
                  </span>
                )}
              </div>
            </div>

            {setupError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            {/* 2FA SETUP STEPS */}
            {setupStep === 'idle' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {user?.twoFactorEnabled
                    ? 'Two-factor authentication (TOTP) is active for your account. Every login attempt requires your password and a 6-digit code from your authenticator app.'
                    : 'Add an extra layer of protection to your account. When enabled, logging in will require both your password and a 6-digit verification code from your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.).'}
                </p>

                <div className="flex flex-wrap gap-2.5">
                  {user?.twoFactorEnabled ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordModal('disable')}
                        className="border border-red-200 text-red-650 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Disable 2FA
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordModal('regenerate_codes')}
                        className="border border-slate-250 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw size={12} />
                        <span>Regenerate Recovery Codes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordModal('regenerate')}
                        className="border border-slate-250 text-slate-650 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw size={12} />
                        <span>Regenerate Secret Key</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInitiate2FA}
                      className="btn-primary px-5 py-2.5 text-xs font-bold shadow-md"
                    >
                      Enable Two-Factor Authentication
                    </button>
                  )}
                </div>
              </div>
            )}

            {setupStep === 'scan' && (
              <div className="space-y-6 animate-slide-up">
                <p className="text-xs text-slate-500 font-medium">
                  Configure your authenticator app by scanning the QR code or manually typing the secret key.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  {/* QR and Secret Column */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner space-y-3.5">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                      <img src={twoFactorQrUrl} alt="2FA QR Code" className="w-36 h-36" />
                    </div>
                    <div className="w-full space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                        Secret Key (Manual Entry)
                      </span>
                      <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                        <code className="text-xs font-mono font-bold text-slate-700 tracking-wider overflow-x-auto select-all max-w-[160px] md:max-w-none">
                          {secretText}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="text-slate-400 hover:text-primary-600 transition-colors shrink-0"
                          title="Copy Secret"
                        >
                          {copiedSecret ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Instructions and Input Column */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Setup Instructions</h4>
                    <ol className="text-[11px] text-slate-500 space-y-1.5 list-decimal list-inside pl-1 font-medium">
                      <li>Open your authenticator app.</li>
                      <li>Scan the QR code or enter the secret key manually.</li>
                      <li>Scan the image on the left, or input the secret key.</li>
                      <li>Enter the generated 6-digit verification code below.</li>
                    </ol>

                    <div className="space-y-2 pt-2.5 border-t border-slate-100">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Verification Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          className="input-field text-center font-mono font-bold text-base tracking-widest max-w-[120px]"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleVerifySetup}
                          disabled={verifying}
                          className="btn-primary px-4 py-2 text-xs font-bold shadow-md flex-1 flex items-center justify-center gap-1.5"
                        >
                          {verifying && <RefreshCw size={12} className="animate-spin" />}
                          <span>{verifying ? 'Verifying...' : 'Verify & Enable'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setSetupStep('idle')}
                        className="text-xs text-slate-500 hover:text-slate-700 font-semibold underline"
                      >
                        Cancel Setup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {setupStep === 'recovery_codes' && (
              <div className="space-y-5 animate-slide-up">
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold">
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span>2FA Configuration Updated Successfully!</span>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <AlertCircle size={14} className="text-amber-500" />
                    <span>Save Backup Recovery Codes</span>
                  </h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                    If you lose access to your authenticator app, these recovery codes are the ONLY way to log into your account. Copy or download them now and store them securely. Each code can be used only once.
                  </p>
                </div>

                {/* Recovery Codes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
                  {recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-center font-mono font-bold text-xs text-slate-700 select-all"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyRecoveryCodes}
                    className="border border-slate-205 text-slate-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    {copiedCodes ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copiedCodes ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadRecoveryCodes}
                    className="border border-slate-205 text-slate-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download size={14} />
                    <span>Download as TXT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupStep('idle')}
                    className="btn-primary px-4 py-2 text-xs font-bold shadow-md ml-auto"
                  >
                    Done (I've saved them)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3.5 font-bold text-sm shadow-premium flex items-center justify-center"
        >
          {loading ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </form>

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
                type="button"
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
                ? 'For your security, please confirm your password to disable Two-Factor Authentication.'
                : modalAction === 'regenerate_codes'
                ? 'Please confirm your password to regenerate your recovery codes. Old recovery codes will stop working.'
                : 'Please confirm your password to regenerate your 2FA keys. Scanning a new QR code will be required, and your old authenticator device credentials will stop working.'}
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
                  value={twoFactorConfirmPassword}
                  onChange={(e) => setTwoFactorConfirmPassword(e.target.value)}
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

export default Profile;
