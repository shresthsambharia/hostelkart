import React, { useState, useEffect } from 'react';
import { MapPin, X, Building2, Home, Compass, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const POPULAR_HOSTELS = [
  'Brahmaputra',
  'Lohit',
  'Kapili',
  'Umiam',
  'Barak',
  'Dihing',
  'Manas',
  'Kameng',
  'Siang',
  'Dhansiri',
  'Subansiri',
  'Disang',
  'Hostel Block H'
];

const POPULAR_BLOCKS = ['A', 'B', 'C', 'D', 'E', 'Core'];
const POPULAR_FLOORS = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];

export default function DeliveryLocationModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();

  const [hostelName, setHostelName] = useState('');
  const [customHostel, setCustomHostel] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Sync state when modal opens or user profile changes
  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      const details = user?.hostelDetails || (() => {
        try {
          const saved = localStorage.getItem('guestHostelDetails');
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();

      if (details) {
        const hName = details.hostelName || '';
        if (POPULAR_HOSTELS.includes(hName)) {
          setHostelName(hName);
          setCustomHostel('');
        } else if (hName) {
          setHostelName('Other');
          setCustomHostel(hName);
        } else {
          setHostelName('');
          setCustomHostel('');
        }
        setBlock(details.block || '');
        setFloor(details.floor || '');
        setRoomNumber(details.roomNumber || '');
        setLandmark(details.landmark || '');
        setDeliveryInstructions(details.deliveryInstructions || '');
      } else {
        setHostelName('');
        setCustomHostel('');
        setBlock('');
        setFloor('');
        setRoomNumber('');
        setLandmark('');
        setDeliveryInstructions('');
      }
    }
  }, [isOpen, user]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setFeedback(null);

    const selectedHostel = hostelName === 'Other' ? customHostel.trim() : hostelName.trim();

    if (!selectedHostel) {
      setFeedback({ type: 'error', message: 'Please select or enter your Hostel name.' });
      return;
    }

    if (!roomNumber.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your Room number for delivery.' });
      return;
    }

    const payload = {
      hostelName: selectedHostel,
      block: block.trim(),
      floor: floor.trim(),
      roomNumber: roomNumber.trim(),
      landmark: landmark.trim(),
      deliveryInstructions: deliveryInstructions.trim(),
    };

    setIsSaving(true);
    try {
      if (user) {
        const result = await updateProfile({ hostelDetails: payload });
        if (result?.success) {
          setFeedback({ type: 'success', message: 'Delivery location updated successfully!' });
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setFeedback({ type: 'error', message: result?.message || 'Failed to update delivery location.' });
        }
      } else {
        // Guest user local storage persistence
        localStorage.setItem('guestHostelDetails', JSON.stringify(payload));
        setFeedback({ type: 'success', message: 'Delivery location saved for this session!' });
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch {
      setFeedback({ type: 'error', message: 'An unexpected error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-location-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 id="delivery-location-title" className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Select Delivery Location
              </h2>
              <p className="text-xs text-slate-400 font-medium">Corridor Room & Block drop-off details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors focus:outline-none"
            aria-label="Close delivery location modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? <Check size={16} className="shrink-0 text-emerald-600" /> : <AlertCircle size={16} className="shrink-0 text-rose-600" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Hostel Name Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-primary-600" />
              <span>Hostel / Bhawan <span className="text-rose-500">*</span></span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200/80">
              {POPULAR_HOSTELS.map((h) => {
                const isSelected = hostelName === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHostelName(h);
                      setCustomHostel('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setHostelName('Other')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  hostelName === 'Other'
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                Other / Custom
              </button>
            </div>

            {hostelName === 'Other' && (
              <input
                type="text"
                placeholder="Type your hostel or building name..."
                value={customHostel}
                onChange={(e) => setCustomHostel(e.target.value)}
                className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            )}
          </div>

          {/* Block and Floor row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Block */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={14} className="text-primary-600" />
                <span>Block / Wing</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_BLOCKS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBlock(b)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      block === b
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or custom block (e.g. D-Wing)"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Floor */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Home size={14} className="text-primary-600" />
                <span>Floor Level</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_FLOORS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFloor(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      floor === f
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Floor (e.g. 2nd Floor)"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Room Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Home size={14} className="text-emerald-600" />
              <span>Room Number <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              placeholder="e.g. 204, B-112, 401"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
              required
            />
          </div>

          {/* Delivery Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Delivery Instructions <span className="text-slate-400 font-normal lowercase">(optional)</span></span>
            </label>
            <input
              type="text"
              placeholder="e.g. Leave at door, call when outside corridor..."
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-slate-400"
            />
          </div>
        </form>

        {/* Footer actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Save Location</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
