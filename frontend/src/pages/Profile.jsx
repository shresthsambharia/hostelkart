import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Phone, MapPin, Key, CheckCircle } from 'lucide-react';

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-slide-up">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">My Profile Settings</h1>
        <p className="text-sm text-slate-500">Update your account personal settings and hostel address</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl flex items-center space-x-2 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center space-x-2 text-sm">
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
            <User size={16} className="text-primary-600" />
            <span>Personal Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
              <input
                type="text"
                className="input-field text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Email (ReadOnly)</label>
              <input
                type="text"
                className="input-field text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                value={user?.email || ''}
                readOnly
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  className="input-field text-sm pl-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Phone size={14} className="text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Your Role (ReadOnly)</label>
              <input
                type="text"
                className="input-field text-sm bg-slate-50 text-slate-500 font-bold capitalize cursor-not-allowed"
                value={user?.role || ''}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Address Details (Student role only) */}
        {user?.role === 'student' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
              <MapPin size={16} className="text-primary-600" />
              <span>Hostel Address details (Default)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Hostel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramanujan Hostel"
                  className="input-field text-sm"
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Block / Wing</label>
                <input
                  type="text"
                  placeholder="e.g. B-Block"
                  className="input-field text-sm"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Floor</label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Floor"
                  className="input-field text-sm"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g. 215"
                  className="input-field text-sm"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near the washroom / Opposite to staircase"
                  className="input-field text-sm"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Alternate Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  className="input-field text-sm"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Delivery Instructions</label>
                <textarea
                  placeholder="e.g. Call before coming up, leave outside if door locked"
                  rows={2}
                  className="input-field text-sm"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Change password */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
            <Key size={16} className="text-primary-600" />
            <span>Change Password (Leave blank to keep current)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">New Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                className="input-field text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                className="input-field text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 font-bold text-sm shadow-md"
        >
          {loading ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
