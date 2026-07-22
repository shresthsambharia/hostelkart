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

  useEffect(() => {
    const apiURL = import.meta.env.VITE_API_URL || 'https://hostelkart-backend.onrender.com';
    const backendBase = apiURL.replace(/\/api\/?$/, '');
    fetch(`${backendBase}/health`).catch(() => {});
  }, []);

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
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/20">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-premium space-y-6">
        <div className="text-center space-y-1.5 select-none">
          <h2 className="text-xl font-black text-slate-900 tracking-tight font-display">
            {twoFactorRequired ? (
              <span>2-Step Verification</span>
            ) : (
              <span>Welcome to HostelKart</span>
            )}
          </h2>
          <p className="text-[10px] text-slate-450 font-bold uppercase">
            {twoFactorRequired 
              ? 'Security verification check'
              : 'Daily hostel essentials delivered to your room'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-2xl flex items-start gap-2 font-bold animate-slide-down">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {twoFactorRequired ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="2fa-code" className="text-[10px] font-black text-slate-405 uppercase block mb-1">
                  {isRecovery ? 'Recovery Backup Code' : 'Verification OTP Code'}
                </label>
                <div className="relative">
                  <input
                    id="2fa-code"
                    type="text"
                    required
                    maxLength={isRecovery ? 12 : 6}
                    autoComplete="one-time-code"
                    autoFocus
                    className="input-field pl-10 font-mono tracking-widest text-center text-base py-2.5 font-bold"
                    placeholder={isRecovery ? 'XXXX-XXXX' : '000000'}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                  {isRecovery ? (
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  ) : (
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  )}
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-2 text-center">
                  {isRecovery
                    ? 'Enter one of your backup recovery codes.'
                    : 'Open your authenticator app to view the 6-digit code.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label htmlFor="email-address" className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email-address"
                    type="email"
                    required
                    autoComplete="email"
                    className="input-field pl-10 text-xs py-2.5 font-bold"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input-field pl-10 text-xs py-2.5 font-bold"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {slowNotice && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-center gap-1.5 text-amber-800 text-[10px] font-black uppercase animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                <span>Waking server instance, please wait...</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-primary-600 hover:bg-primary-750 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm hover:shadow-md active:scale-95 disabled:opacity-75"
            >
              {isSubmitting || loading ? (
                <span className="flex items-center justify-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </span>
              ) : (
                <span>{twoFactorRequired ? 'Confirm verification' : 'Sign In'}</span>
              )}
            </button>

            {twoFactorRequired && (
              <div className="flex flex-col gap-2 pt-2 text-center select-none">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovery(!isRecovery);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="text-[10px] text-primary-650 hover:underline font-black uppercase"
                >
                  {isRecovery ? 'Use app authentication code' : 'Lost authenticator? Use backup code'}
                </button>
                
                <button
                  type="button"
                  onClick={handleCancel2FA}
                  className="text-[9px] text-slate-400 hover:underline font-black uppercase flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={10} />
                  <span>Back to login screen</span>
                </button>
              </div>
            )}
          </div>
        </form>

        {!twoFactorRequired && (
          <div className="text-center pt-2 select-none">
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-650 hover:underline font-black">
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
