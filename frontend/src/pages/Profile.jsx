import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Phone, MapPin, Key, CheckCircle, ShoppingBag, ArrowRight,
  Shield, Bike, ClipboardList, Layers, ShieldCheck, ShieldAlert,
  Copy, Check, Lock, X, Download, RefreshCw, AlertCircle
} from 'lucide-react';
import { orderAPI, authAPI } from '../api';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, updateProfile, refreshProfile } = useAuth();

  // 2FA setups
  const [setupStep, setSetupStep] = useState('idle');
  const [secretText, setSecretText] = useState('');
  const [twoFactorQrUrl, setTwoFactorQrUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [twoFactorConfirmPassword, setTwoFactorConfirmPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [modalAction, setModalAction] = useState('');

  const [setupError, setSetupError] = useState('');
  const [modalError, setModalError] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Addresses
  const [hostelName, setHostelName] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Passwords
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
          console.error("Failed to fetch profile orders count:", err);
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
      const profileData = { name, phone };

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
      setErrorMsg('An error occurred during update');
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
      setSetupError(error.response?.data?.message || 'Failed to initiate setup');
    }
  };

  const handleVerifySetup = async () => {
    if (!verificationCode || verificationCode.trim().length !== 6) {
      setSetupError('Please enter a 6-digit verification code');
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
      setSetupError(error.response?.data?.message || 'Invalid code');
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
        setSuccessMsg('Two-factor authentication disabled!');
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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-24">
      {/* Profile Header Dashboard */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-premium select-none">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary-500 to-emerald-500 text-white font-black text-2xl flex items-center justify-center shadow-lg border border-white/10 shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{user?.name}</h1>
              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${
                user?.role === 'admin' 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                  : user?.role === 'delivery'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {user?.role} Portal
              </span>
            </div>
            <p className="text-slate-455 text-xs font-semibold">{user?.email}</p>
            <p className="text-[10px] text-slate-400 flex items-center justify-center sm:justify-start gap-1 pt-1.5 font-bold">
              <Shield size={12} className="text-emerald-400" />
              <span>Secure Session • {user?.role === 'student' ? 'Corridor Room Delivery' : 'Internal Ops Access'}</span>
            </p>
          </div>
        </div>

        {user?.role === 'student' && (
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 mt-6 pt-6 text-center">
            <div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Total Orders</span>
              <span className="text-base font-black text-white mt-0.5 block">{orderCount}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Hostel Block</span>
              <span className="text-base font-black text-white mt-0.5 block truncate">{block || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Room Number</span>
              <span className="text-base font-black text-white mt-0.5 block">{roomNumber || 'N/A'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation shortcuts */}
      <div className="space-y-2 select-none">
        <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">QUICK OPERATION SHORTCUTS</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {user?.role === 'student' && (
            <>
              <Link to="/myorders" className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium-sm hover:border-slate-200 transition-all font-bold text-xs text-slate-700">
                <span className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-primary-600" />
                  <span>My Orders</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link to="/cart" className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium-sm hover:border-slate-200 transition-all font-bold text-xs text-slate-700">
                <span className="flex items-center gap-2">
                  <ShoppingBag size={15} className="text-primary-600" />
                  <span>Shopping Cart</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link to="/custom-request" className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium-sm hover:border-slate-200 transition-all font-bold text-xs text-slate-700">
                <span className="flex items-center gap-2">
                  <Layers size={15} className="text-primary-600" />
                  <span>Custom Request</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
            </>
          )}

          {user?.role === 'delivery' && (
            <>
              <Link to="/delivery/dashboard" className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium-sm hover:border-slate-200 transition-all font-bold text-xs text-slate-700">
                <span className="flex items-center gap-2">
                  <Bike size={15} className="text-primary-600" />
                  <span>Delivery Control</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link to="/admin/dashboard" className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium-sm hover:border-slate-200 transition-all font-bold text-xs text-slate-700">
                <span className="flex items-center gap-2">
                  <Shield size={15} className="text-rose-600" />
                  <span>Analytics Control</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link to="/admin/orders" className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium-sm hover:border-slate-200 transition-all font-bold text-xs text-slate-700">
                <span className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-rose-600" />
                  <span>Manage Orders</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
              <Link to="/admin/products" className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-premium-sm hover:border-slate-200 transition-all font-bold text-xs text-slate-700">
                <span className="flex items-center gap-2">
                  <ShoppingBag size={15} className="text-rose-600" />
                  <span>Inventory Catalog</span>
                </span>
                <ArrowRight size={12} className="text-slate-400" />
              </Link>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold select-none">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold select-none">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Personal Details */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2 select-none">
            <User size={15} className="text-primary-600" />
            <span>Personal Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Full Name</label>
              <input
                type="text"
                className="input-field text-xs py-2 font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Email Address (ReadOnly)</label>
              <input
                type="text"
                className="input-field text-xs py-2 bg-slate-50 text-slate-450 font-bold cursor-not-allowed"
                value={user?.email || ''}
                readOnly
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mobile Contact Number</label>
              <input
                type="tel"
                placeholder="10 digit number"
                className="input-field text-xs py-2 font-bold"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Room Addresses */}
        {user?.role === 'student' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2 select-none">
              <MapPin size={15} className="text-primary-600" />
              <span>Room Destination Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hostel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramanujan Hostel"
                  className="input-field text-xs py-2 font-bold"
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Block / Wing</label>
                <input
                  type="text"
                  placeholder="e.g. A-Block"
                  className="input-field text-xs py-2 font-bold"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Floor</label>
                <input
                  type="text"
                  placeholder="e.g. 3rd Floor"
                  className="input-field text-xs py-2 font-bold"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. 302"
                  className="input-field text-xs py-2 font-bold"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Landmark / Corridor Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Near lift lobby"
                  className="input-field text-xs py-2 font-bold"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Alternate Phone Number</label>
                <input
                  type="tel"
                  placeholder="Alt mobile number"
                  className="input-field text-xs py-2 font-bold"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Rider Instructions</label>
                <textarea
                  placeholder="e.g. Call when outside the block gate"
                  rows={2}
                  className="input-field text-xs py-2"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Change password */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2 select-none">
            <Key size={15} className="text-primary-600" />
            <span>Update Password (Leave empty to keep current)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">New Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                className="input-field text-xs py-2 font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                className="input-field text-xs py-2 font-bold"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Security / 2FA configurations */}
        {user && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 select-none">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                {user?.twoFactorEnabled ? (
                  <ShieldCheck className="text-emerald-500 w-4.5 h-4.5" />
                ) : (
                  <Shield className="text-slate-400 w-4.5 h-4.5" />
                )}
                <span>Two-Factor Authentication (2FA)</span>
              </h3>

              <div>
                {user?.twoFactorEnabled ? (
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] px-2.5 py-0.5 rounded-lg font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Enabled</span>
                  </span>
                ) : (
                  <span className="bg-slate-50 text-slate-500 text-[9px] px-2.5 py-0.5 rounded-lg font-black uppercase border border-slate-200">
                    Disabled
                  </span>
                )}
              </div>
            </div>

            {setupError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs flex items-center gap-2 font-bold select-none animate-slide-down">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            {/* steps logic */}
            {setupStep === 'idle' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {user?.twoFactorEnabled
                    ? '2FA security is active. A verification code from your authenticator app is required at login.'
                    : 'Secure your room orders account by enabling 2FA. Every login attempt will verify a 6-digit token from Google/Microsoft Authenticator app.'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1 select-none">
                  {user?.twoFactorEnabled ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordModal('disable')}
                        className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl"
                      >
                        Disable 2FA
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordModal('regenerate_codes')}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Regen Recovery Codes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordModal('regenerate')}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-750 text-xs font-bold rounded-xl flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Regen Secret Key</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInitiate2FA}
                      className="bg-primary-600 hover:bg-primary-750 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm active:scale-95"
                    >
                      Enable 2FA Protection
                    </button>
                  )}
                </div>
              </div>
            )}

            {setupStep === 'scan' && (
              <div className="space-y-5 animate-slide-down">
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Scan the QR code below using your authenticator app (GPay Authenticator, Authy, Microsoft Authenticator) or enter the secret key manually.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex flex-col items-center bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3 shadow-inner">
                    <div className="bg-white p-2 rounded-2xl border border-slate-200">
                      <img src={twoFactorQrUrl} alt="2FA QR Code" className="w-32 h-32 object-contain" />
                    </div>
                    <div className="w-full text-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Manual Entry Secret Key</span>
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm font-mono text-[10px] font-bold text-slate-700">
                        <span className="truncate select-all">{secretText}</span>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="text-slate-450 hover:text-primary-600"
                        >
                          {copiedSecret ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5 font-bold text-slate-500 text-[11px] leading-relaxed">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Instructions</p>
                      <p>1. Open Authenticator on your mobile.</p>
                      <p>2. Add account and scan the QR on the left.</p>
                      <p>3. Input the 6-digit TOTP code below to verify.</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Verification OTP Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          className="input-field text-center font-mono font-bold text-base tracking-widest max-w-[110px]"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleVerifySetup}
                          disabled={verifying}
                          className="bg-primary-600 hover:bg-primary-750 text-white font-black px-4 rounded-xl text-xs uppercase tracking-wider flex-1 flex items-center justify-center gap-1"
                        >
                          {verifying && <RefreshCw size={12} className="animate-spin" />}
                          <span>{verifying ? 'Verifying...' : 'Verify'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSetupStep('idle')}
                      className="text-xs font-bold text-slate-450 hover:underline"
                    >
                      Cancel Setup
                    </button>
                  </div>
                </div>
              </div>
            )}

            {setupStep === 'recovery_codes' && (
              <div className="space-y-5 animate-slide-down">
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs flex items-center gap-2 font-black select-none">
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span>2FA Enabled Successfully!</span>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-1 select-none">
                  <h4 className="text-xs font-black text-amber-800 flex items-center gap-1">
                    <AlertCircle size={14} className="text-amber-600 animate-bounce" />
                    <span>Save Backup Recovery Codes</span>
                  </h4>
                  <p className="text-[10px] text-amber-700 leading-normal font-semibold uppercase">
                    Keep these codes safe. They are the only way to login if you lose your phone or app.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                  {recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-center font-mono font-black text-xs text-slate-700 select-all"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1 select-none">
                  <button
                    type="button"
                    onClick={handleCopyRecoveryCodes}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-750 text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <span>{copiedCodes ? 'Copied' : 'Copy Codes'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadRecoveryCodes}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-750 text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <Download size={14} />
                    <span>Download TXT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupStep('idle')}
                    className="bg-primary-600 hover:bg-primary-750 text-white font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider ml-auto shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-750 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-premium hover:shadow-premium-hover active:scale-98 transition-all flex items-center justify-center min-h-[44px]"
        >
          {loading ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </form>

      {/* Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-slide-down">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Lock className="text-primary-650 w-4.5 h-4.5" />
                <span>Confirm Security Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs flex items-center gap-2 font-bold animate-slide-down">
                <AlertCircle size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              {modalAction === 'disable'
                ? 'Please confirm your account password to disable two-factor authentication.'
                : modalAction === 'regenerate_codes'
                ? 'Confirm password to generate new recovery codes. Old recovery codes will stop working.'
                : 'Confirm password to regenerate your 2FA keys. Scanning a new QR code will be required.'}
            </p>

            <form onSubmit={handleConfirmPasswordAction} className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block">Account Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  autoFocus
                  className="input-field text-xs py-2 font-bold"
                  value={twoFactorConfirmPassword}
                  onChange={(e) => setTwoFactorConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-slate-205 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="bg-primary-600 hover:bg-primary-750 text-white font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1"
                >
                  {submittingModal && <RefreshCw size={12} className="animate-spin" />}
                  <span>Confirm</span>
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
