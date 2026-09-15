import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { addToCartImpl } from './ai/aiController.js';
import User from './models/User.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';

async function test() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  let testUser = await User.findOne({ email: 'student@hostelkart.com' });
  if (!testUser) {
    testUser = await User.create({
      name: 'Test Student',
      email: 'student@hostelkart.com',
      password: 'student123',
      role: 'student'
    });
  }

  const res = await addToCartImpl(null, 'Royal Gala Apple', 1, testUser);
  console.log('Result:', JSON.stringify(res, null, 2));

  await mongoose.disconnect();
}

test();
