import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Shield, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slowNotice, setSlowNotice] = useState(false);
  
  const { login, login2FA, user, loading } = useAuth();
  const navigate = useNavigate();

  // Pre-warm backend instance as soon as the login page opens
  useEffect(() => {
    const apiURL = import.meta.env.VITE_API_URL || 'https://hostelkart-backend.onrender.com';
    const backendBase = apiURL.replace(/\/api\/?$/, '');
    fetch(`${backendBase}/health`).catch(() => {});
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'delivery') navigate('/delivery/dashboard');
      else navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const slowTimer = setTimeout(() => {
      setSlowNotice(true);
    }, 3000);

    try {
      if (twoFactorRequired) {
        if (!twoFactorCode) {
          setError(isRecovery ? 'Please enter your recovery code' : 'Please enter your 6-digit verification code');
          setIsSubmitting(false);
          clearTimeout(slowTimer);
          setSlowNotice(false);
          return;
        }
        
        const res = await login2FA(twoFactorCode, twoFactorToken, isRecovery);
        if (!res.success) {
          setError(res.message);
        }
        return;
      }

      if (!email || !password) {
        setError('Please fill in all fields');
        setIsSubmitting(false);
        clearTimeout(slowTimer);
        setSlowNotice(false);
        return;
      }

      const res = await login(email, password);
      if (res.success) {
        if (res.twoFactorRequired) {
          setTwoFactorRequired(true);
          setTwoFactorToken(res.twoFactorToken);
          setTwoFactorCode('');
          setIsRecovery(false);
        }
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message || 'Authentication error. Please try again.');
    } finally {
      clearTimeout(slowTimer);
      setIsSubmitting(false);
      setSlowNotice(false);
    }
  };

  const handleCancel2FA = () => {
    setTwoFactorRequired(false);
    setTwoFactorToken('');
    setTwoFactorCode('');
    setIsRecovery(false);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-slide-up">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {twoFactorRequired ? (
              <span>2-Step <span className="text-primary-600">Verification</span></span>
            ) : (
              <span>Welcome to <span className="text-primary-600">HostelKart</span></span>
            )}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {twoFactorRequired 
              ? 'Provide verification details to access your admin account'
              : 'Daily hostel essentials delivered to your room'}
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start space-x-2 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {twoFactorRequired ? (
            /* 2FA Form Inputs */
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="2fa-code" className="text-xs font-semibold text-slate-600 block mb-1">
                  {isRecovery ? 'Recovery Code' : 'Verification Code'}
                </label>
                <div className="relative">
                  <input
                    id="2fa-code"
                    name="twoFactorCode"
                    type="text"
                    required
                    maxLength={isRecovery ? 12 : 6}
                    autoComplete="one-time-code"
                    autoFocus
                    className="input-field pl-10 tracking-widest font-mono text-center text-lg"
                    placeholder={isRecovery ? 'XXXX-XXXX' : '000000'}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                  {isRecovery ? (
                    <KeyRound className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  ) : (
                    <Shield className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  {isRecovery
                    ? 'Enter one of your unused 8-character recovery codes generated during setup.'
                    : 'Open your authenticator app (Google Authenticator, Authy, etc.) to view your code.'}
                </p>
              </div>
            </div>
          ) : (
            /* Standard Login Form Inputs */
             <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="email-address" className="text-xs font-semibold text-slate-600 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="input-field pl-10"
                    placeholder="name@university.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-semibold text-slate-600 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input-field pl-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {slowNotice && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-center space-x-2 text-amber-800 text-xs font-semibold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                <span>Waking up secure server instance, please hold on...</span>
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full btn-primary text-sm flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {(isSubmitting || loading) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{slowNotice ? 'Connecting to Server...' : 'Signing In...'}</span>
                </>
              ) : (
                <span>{twoFactorRequired ? 'Verify & Sign In' : 'Sign In'}</span>
              )}
            </button>

            {twoFactorRequired && (
              <div className="flex flex-col gap-2 pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovery(!isRecovery);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-bold"
                >
                  {isRecovery ? 'Use authenticator app code' : 'Lost device? Use a backup recovery code'}
                </button>
                
                <button
                  type="button"
                  onClick={handleCancel2FA}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 mt-1"
                >
                  <ArrowLeft size={12} />
                  <span>Back to password login</span>
                </button>
              </div>
            )}
          </div>
        </form>

        {!twoFactorRequired && (
          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-bold">
                Register as Student
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

