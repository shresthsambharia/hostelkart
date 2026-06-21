import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Phone, MapPin, Key, CheckCircle, ShoppingBag, ArrowRight, Shield, Bike, Landmark, ClipboardList, Layers } from 'lucide-react';
import { orderAPI } from '../api';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
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

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3.5 font-bold text-sm shadow-premium flex items-center justify-center"
        >
          {loading ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
