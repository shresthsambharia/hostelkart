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
      enum: ['student', 'admin', 'delivery'],
      default: 'student',
    },
    phone: {
      type: String,
      default: '',
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

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
