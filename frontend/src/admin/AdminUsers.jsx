import React, { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { Users, Calendar, Plus, Edit2, Trash2, ShieldCheck, AlertCircle, Phone, Truck } from 'lucide-react';

const AdminUsers = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'delivery'
  const [users, setUsers] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Delivery CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState(null);

  // Form fields for Rider CRUD
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [status, setStatus] = useState('Active');

  // Error/Success Alerts
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRes = await adminAPI.getAllUsers();
      setUsers(usersRes.data);

      const ridersRes = await adminAPI.getDeliveryPartners();
      setRiders(ridersRes.data);
    } catch (error) {
      console.error('Error fetching dashboard users data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditMode(false);
    setSelectedRiderId(null);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setVehicleNumber('');
    setStatus('Active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (r) => {
    setEditMode(true);
    setSelectedRiderId(r._id);
    setName(r.name);
    setEmail(r.email);
    setPassword(''); // Leave blank on edit unless changing
    setPhone(r.phone || '');
    setVehicleNumber(r.vehicleNumber || '');
    setStatus(r.status || 'Active');
    setModalOpen(true);
  };

  const handleDeleteRider = async (id, riderName) => {
    if (window.confirm(`Are you sure you want to remove delivery partner "${riderName}"?`)) {
      setAlert({ type: '', message: '' });
      try {
        await adminAPI.deleteDeliveryPartner(id);
        setAlert({ type: 'success', message: `Delivery partner "${riderName}" removed successfully` });
        fetchData();
      } catch (error) {
        setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to delete rider' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    if (!name || !email || (!editMode && !password)) {
      setAlert({ type: 'error', message: 'Name, email and password are required' });
      return;
    }

    const payload = {
      name,
      email,
      phone,
      vehicleNumber,
      status
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (editMode) {
        await adminAPI.updateDeliveryPartner(selectedRiderId, payload);
        setAlert({ type: 'success', message: `Delivery partner "${name}" updated successfully` });
      } else {
        await adminAPI.addDeliveryPartner(payload);
        setAlert({ type: 'success', message: `Delivery partner "${name}" added successfully` });
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Action failed' });
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-50 text-red-700 border-red-100';
      case 'delivery': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'student': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <>
      <div className="space-y-6 p-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Users & Staff Management</h1>
          <p className="text-sm text-slate-500">Manage registered students, administrators, and campus delivery partners</p>
        </div>
        {activeTab === 'delivery' && (
          <button onClick={handleOpenAddModal} className="btn-primary flex items-center space-x-1.5 text-sm py-2 px-4 shadow-md">
            <Plus size={16} />
            <span>Add Delivery Partner</span>
          </button>
        )}
      </div>

      {/* Tab Switchers */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Users size={16} />
            <span>All Registered Users ({users.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`pb-3 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'delivery'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Truck size={16} />
            <span>Delivery Partners ({riders.length})</span>
          </div>
        </button>
      </div>

      {/* Status banner */}
      {alert.message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-2 text-sm ${
          alert.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Content tabs */}
      {loading ? (
        <div className="p-12 animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/4"></div>
          <div className="h-24 bg-slate-50 rounded"></div>
        </div>
      ) : activeTab === 'users' ? (
        /* Users Table tab */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {users.length === 0 ? (
            <p className="text-slate-400 italic text-center py-12 text-sm">No registered users in database.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                    <th className="p-4">User ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Registered On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 font-mono text-slate-400">{u._id}</td>
                      <td className="p-4 font-bold text-slate-800 flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{u.email}</td>
                      <td className="p-4 text-slate-500 font-semibold">{u.phone || 'Not Specified'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${getRoleColor(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-semibold flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Delivery Partners tab */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {riders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Truck size={32} className="mx-auto text-slate-300" />
              <p className="italic text-sm">No delivery partners registered yet.</p>
              <button onClick={handleOpenAddModal} className="btn-primary py-1.5 px-4 text-xs font-bold inline-block mt-2">
                Register First Rider
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                    <th className="p-4">Rider Details</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Vehicle Number</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {riders.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 font-bold text-slate-800 flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{r.name}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{r.email}</td>
                      <td className="p-4 text-slate-500 font-semibold">{r.phone || 'Not Specified'}</td>
                      <td className="p-4 font-mono font-bold text-slate-800">{r.vehicleNumber || 'No Vehicle'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${
                          r.status === 'Active'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : r.status === 'On Delivery'
                            ? 'bg-amber-50 border-amber-100 text-amber-700'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2.5">
                          <button
                            onClick={() => handleOpenEditModal(r)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Rider"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteRider(r._id, r.name)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete Rider"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Add / Edit Rider Form Modal */}
    {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1.5px] p-4 overflow-y-auto">
          <div className="relative bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-800">
                {editMode ? 'Edit Delivery Rider' : 'Add Delivery Partner'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Rider Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  className="input-field text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@hostelkart.com"
                  className="input-field text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {editMode ? 'New Password (Leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  className="input-field text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editMode}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="10 digit mobile number"
                  className="input-field text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Vehicle / Cycle License Number</label>
                <input
                  type="text"
                  placeholder="e.g. KA-03-EM-8822 or Bicycle"
                  className="input-field text-sm"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>

              {editMode && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Rider Status</label>
                  <select
                    className="input-field text-sm bg-white"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Delivery">On Delivery</option>
                  </select>
                </div>
              )}

              {/* Submit actions */}
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 btn-primary py-2.5 text-xs font-bold shadow-md">
                  {editMode ? 'Save Rider Details' : 'Register Rider'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary py-2.5 px-6 text-xs font-bold">
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminUsers;
