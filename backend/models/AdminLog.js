import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adminName: {
    type: String,
    default: '',
  },
  orderNumber: {
    type: String,
    default: '',
  },
  action: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  details: {
    type: Object,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const AdminLog = mongoose.model('AdminLog', adminLogSchema);

export default AdminLog;
