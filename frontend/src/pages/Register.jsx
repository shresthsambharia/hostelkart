import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Phone, AlertCircle } from 'lucide-react';
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
  const { register, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
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

    const res = await register(name, email, password, phone, captchaId, captchaAnswer);
    if (!res.success) {
      setError(res.message);
      fetchCaptcha();
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-slide-up">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Create an Account
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Join HostelKart to order room-delivery essentials
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
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
           <div>
            <label htmlFor="fullname" className="text-xs font-semibold text-slate-600 block mb-1">
              Full Name
            </label>
            <div className="relative">
              <input
                id="fullname"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="input-field pl-10"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

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
                placeholder="john.doe@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label htmlFor="phone-number" className="text-xs font-semibold text-slate-600 block mb-1">
              Phone Number
            </label>
            <div className="relative">
              <input
                id="phone-number"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                className="input-field pl-10"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
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
                autoComplete="new-password"
                className="input-field pl-10"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="text-xs font-semibold text-slate-600 block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="input-field pl-10"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label htmlFor="captcha" className="text-xs font-semibold text-slate-600 block mb-1">
              Verification Code
            </label>
            <div className="flex items-center space-x-3">
              <div 
                className="bg-slate-100 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={fetchCaptcha}
                title="Click to refresh CAPTCHA"
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
                style={{ height: '42px', width: '120px' }}
              />
              <input
                id="captcha"
                name="captchaAnswer"
                type="text"
                required
                className="input-field"
                placeholder="Enter code"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Can't read the image? Click it to refresh</p>
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full btn-primary text-sm">
              Register
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-bold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
