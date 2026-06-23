import mongoose from 'mongoose';

const captchaSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 120, // 2 minutes TTL
  },
});

const Captcha = mongoose.model('Captcha', captchaSchema);

export default Captcha;
