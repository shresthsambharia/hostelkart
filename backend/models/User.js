import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'delivery', 'supplier'],
      default: 'student',
    },
    phone: {
      type: String,
      default: '',
    },
    supplierDetails: {
      businessName: { type: String, default: '' },
      contactPerson: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      gstNumber: { type: String, default: '' },
      panNumber: { type: String, default: '' },
      bankAccount: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      upiId: { type: String, default: '' },
      upiQrCode: { type: String, default: '' },
      category: { type: String, default: '' },
      categoriesSupplied: { type: [String], default: [] },
      businessDescription: { type: String, default: '' },
      commissionPercentage: { type: Number, default: null }, // Null means use category/global rate
      status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Suspended', 'Active', 'Inactive', 'active', 'suspended', 'pending_verification'],
        default: 'Approved',
      },
    },
    hostelDetails: {
      hostelName: { type: String, default: '' },
      block: { type: String, default: '' },
      floor: { type: String, default: '' },
      roomNumber: { type: String, default: '' },
      landmark: { type: String, default: '' },
      alternatePhone: { type: String, default: '' },
      deliveryInstructions: { type: String, default: '' },
    },
    walletBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    referralsCount: {
      type: Number,
      default: 0,
    },
    referralRewardClaimed: {
      type: Boolean,
      default: false,
    },
    loyaltyLevel: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze',
    },
    fcmToken: {
      type: String,
      default: '',
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: '',
    },
    twoFactorTempSecret: {
      type: String,
      default: '',
    },
    twoFactorRecoveryCodes: {
      type: [String],
      default: [],
    },
    loginAttempts: {
      type: Number,
      required: true,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Match user-entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  // Safeguard: Do not re-hash if the password is already a valid bcrypt hash
  if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
