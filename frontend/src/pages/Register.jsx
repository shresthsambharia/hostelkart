import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Phone, AlertCircle, RefreshCw } from 'lucide-react';
import { authAPI } from '../api';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'delivery') navigate('/delivery/dashboard');
      else navigate('/');
    }
  }, [user, navigate]);

  const fetchCaptcha = async () => {
    try {
      const { data } = await authAPI.getCaptcha();
      setCaptchaId(data.captchaId);
      setCaptchaSvg(data.captchaSvg);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Error fetching captcha:', err);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !phone) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!captchaAnswer) {
      setError('Please enter the CAPTCHA verification code');
      return;
    }

    setLoading(true);
    const res = await register(name, email, password, phone, captchaId, captchaAnswer);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      fetchCaptcha();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/20">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-premium space-y-6">
        <div className="text-center space-y-1.5 select-none">
          <h2 className="text-xl font-black text-slate-900 tracking-tight font-display">
            Create an Account
          </h2>
          <p className="text-[10px] text-slate-450 font-bold uppercase">
            Join HostelKart to order room-delivery essentials
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-2xl flex items-start gap-2 font-bold animate-slide-down">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullname" className="text-[10px] font-black text-slate-400 uppercase block mb-1">
              Full Name
            </label>
            <div className="relative">
              <input
                id="fullname"
                type="text"
                required
                autoComplete="name"
                className="input-field pl-10 text-xs py-2.5 font-bold"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

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
                placeholder="john.doe@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label htmlFor="phone-number" className="text-[10px] font-black text-slate-400 uppercase block mb-1">
              Mobile Contact Number
            </label>
            <div className="relative">
              <input
                id="phone-number"
                type="tel"
                required
                autoComplete="tel"
                className="input-field pl-10 text-xs py-2.5 font-bold"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                autoComplete="new-password"
                className="input-field pl-10 text-xs py-2.5 font-bold"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="text-[10px] font-black text-slate-400 uppercase block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                className="input-field pl-10 text-xs py-2.5 font-bold"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5 select-none">
            <label htmlFor="captcha" className="text-[10px] font-black text-slate-400 uppercase block mb-1">
              Verification Code
            </label>
            <div className="flex items-center gap-3">
              <div 
                className="bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 shrink-0 flex items-center justify-center cursor-pointer overflow-hidden shadow-inner"
                onClick={fetchCaptcha}
                title="Click to refresh CAPTCHA"
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
                style={{ height: '38px', width: '110px' }}
              />
              <input
                id="captcha"
                type="text"
                required
                className="input-field text-xs py-2 font-mono font-bold text-center tracking-widest"
                placeholder="Enter CAPTCHA"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-750 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="text-center pt-1 select-none">
          <p className="text-[10px] text-slate-400 font-bold uppercase">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-650 hover:underline font-black">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
