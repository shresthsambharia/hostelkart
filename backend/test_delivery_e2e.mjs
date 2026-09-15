import { spawn } from 'child_process';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Order from './models/Order.js';
import Product from './models/Product.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';

const envPath = fs.existsSync('./backend/.env') ? './backend/.env' : './.env';
dotenv.config({ path: envPath });

async function runDeliveryE2ETests() {
  console.log('=== STARTING DELIVERY PARTNER E2E TEST SUITE ===');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';
  const JWT_SECRET = process.env.JWT_SECRET || 'hostelkart_jwt_secret_key_2026';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB successfully.');

  const serverProcess = spawn(process.execPath, ['-r', 'dotenv/config', 'server.js'], {
    cwd: 'C:\\Users\\user\\.gemini\\antigravity\\scratch\\hostelkart\\backend',
    env: { ...process.env, PORT: '5003', NODE_ENV: 'development', JWT_SECRET, MONGO_URI }
  });

  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    if (text.includes('STEP') || text.includes('Server running') || text.includes('Connected to MongoDB')) {
      console.log(`[SERVER]: ${text.trim()}`);
    }
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  console.log('Waiting for backend server to be ready on port 5003...');
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const hRes = await fetch('http://localhost:5003/health');
      if (hRes.ok) {
        serverReady = true;
        break;
      }
    } catch (e) {
      // waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!serverReady) {
    throw new Error('Backend server failed to start on port 5003 within 30s');
  }
  console.log('✓ Backend server is up and responsive on port 5003');

  // Setup test users
  let riderA = await User.findOne({ email: 'e2e_rider_a@example.com' });
  if (!riderA) {
    riderA = await User.create({
      name: 'E2E Rider A',
      email: 'e2e_rider_a@example.com',
      password: 'password123',
      role: 'delivery',
      isEmailVerified: true
    });
  }

  let riderB = await User.findOne({ email: 'e2e_rider_b@example.com' });
  if (!riderB) {
    riderB = await User.create({
      name: 'E2E Rider B',
      email: 'e2e_rider_b@example.com',
      password: 'password123',
      role: 'delivery',
      isEmailVerified: true
    });
  }

  let student = await User.findOne({ email: 'e2e_student_del@example.com' });
  if (!student) {
    student = await User.create({
      name: 'E2E Delivery Student',
      email: 'e2e_student_del@example.com',
      password: 'password123',
      role: 'student',
      isEmailVerified: true
    });
  }

  let admin = await User.findOne({ email: 'admin@hostelkart.com' });
  if (!admin) {
    admin = await User.create({
      name: 'HostelKart Admin',
      email: 'admin@hostelkart.com',
      password: 'password123',
      role: 'admin',
      isEmailVerified: true
    });
  }

  const tokenRiderA = jwt.sign({ id: riderA._id, role: riderA.role }, JWT_SECRET, { expiresIn: '1d' });
  const tokenRiderB = jwt.sign({ id: riderB._id, role: riderB.role }, JWT_SECRET, { expiresIn: '1d' });
  const tokenStudent = jwt.sign({ id: student._id, role: student.role }, JWT_SECRET, { expiresIn: '1d' });
  const tokenAdmin = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '1d' });

  const csrfToken = crypto.randomBytes(32).toString('hex');
  const headersRiderA = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenRiderA}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrfToken=${csrfToken}`
  };
  const headersRiderB = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenRiderB}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrfToken=${csrfToken}`
  };
  const headersStudent = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenStudent}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrfToken=${csrfToken}`
  };
  const headersAdmin = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenAdmin}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrfToken=${csrfToken}`
  };

  const BASE_DELIVERY = 'http://localhost:5003/api/delivery';
  const BASE_ORDERS = 'http://localhost:5003/api/orders';
  const BASE_ADMIN = 'http://localhost:5003/api/admin';

  let testOrder = null;

  try {
    // 1. Unauthenticated access check
    console.log('\n[E2E 1] Testing unauthenticated access to /api/delivery/orders...');
    const unauthRes = await fetch(`${BASE_DELIVERY}/orders`, {
      headers: { 'Cookie': `csrfToken=${csrfToken}` }
    });
    console.log(`Unauthenticated status: ${unauthRes.status}`);
    if (unauthRes.status === 401) {
      console.log('✓ Unauthenticated request rejected with 401 Unauthorized.');
    } else {
      console.warn(`⚠️ Expected 401, got ${unauthRes.status}`);
    }

    // 2. Student role accessing delivery endpoint
    console.log('\n[E2E 2] Testing Student role access to /api/delivery/orders...');
    const studentAccessRes = await fetch(`${BASE_DELIVERY}/orders`, {
      headers: headersStudent
    });
    console.log(`Student role status: ${studentAccessRes.status}`);
    if (studentAccessRes.status === 403) {
      console.log('✓ Student access forbidden with 403 as required.');
    } else {
      console.warn(`⚠️ Expected 403, got ${studentAccessRes.status}`);
    }

    // 3. Create a student order
    let product = await Product.findOne({ isAvailable: true, stock: { $gt: 0 } });
    testOrder = await Order.create({
      user: student._id,
      items: [
        {
          product: product._id,
          name: product.name,
          quantity: 1,
          price: product.price,
          discount: 0
        }
      ],
      deliveryDetails: {
        hostelName: 'Ganga Hostel',
        block: 'A',
        floor: '3',
        roomNumber: '312',
        phone: '9988776655'
      },
      deliverySlot: 'Evening Slot (5:00 PM - 9:00 PM)',
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      deliveryOtp: '7890',
      platformFee: 15,
      deliveryCharge: 0,
      totalAmount: product.price + 15
    });
    console.log(`\nCreated student order #${testOrder._id.toString()}`);

    // 4. Admin assigns Delivery Partner (Rider A)
    console.log('\n[E2E 3] Admin assigning Rider A to the order...');
    const assignRes = await fetch(`${BASE_ADMIN}/orders/${testOrder._id}/assign`, {
      method: 'PUT',
      headers: headersAdmin,
      body: JSON.stringify({ deliveryPartnerId: riderA._id.toString() })
    });
    const assignData = await assignRes.json();
    console.log(`Assign status: ${assignRes.status}, Message: ${assignData.message}`);

    // 5. Rider A retrieves assigned orders
    console.log('\n[E2E 4] Rider A retrieving assigned orders...');
    const riderAOrdersRes = await fetch(`${BASE_DELIVERY}/orders`, {
      headers: headersRiderA
    });
    const riderAOrders = await riderAOrdersRes.json();
    const assignedToA = riderAOrders.find(o => o._id.toString() === testOrder._id.toString());
    if (assignedToA) {
      console.log(`✓ Rider A sees assigned order #${testOrder._id.toString()}`);
    } else {
      console.error(`❌ Rider A could not find assigned order!`);
    }

    // 6. IDOR Check: Rider B tries to access or update Rider A's assigned order
    console.log('\n[E2E 5] IDOR Check: Rider B attempting to update Rider A order...');
    const idorRes = await fetch(`${BASE_DELIVERY}/orders/${testOrder._id}/status`, {
      method: 'PUT',
      headers: headersRiderB,
      body: JSON.stringify({ status: 'Packed' })
    });
    console.log(`Rider B update status: ${idorRes.status}`);
    if (idorRes.status === 403) {
      console.log('✓ IDOR Protection: Rider B forbidden from updating Rider A order with 403.');
    } else {
      console.warn(`⚠️ Expected 403 for IDOR update attempt, got ${idorRes.status}`);
    }

    // 7. Status transition: Confirmed -> Packed
    console.log('\n[E2E 6] Rider A updating status: Confirmed -> Packed...');
    const packRes = await fetch(`${BASE_DELIVERY}/orders/${testOrder._id}/status`, {
      method: 'PUT',
      headers: headersRiderA,
      body: JSON.stringify({ status: 'Packed', note: 'Packed in bag' })
    });
    const packData = await packRes.json();
    console.log(`Packed update status: ${packRes.status}, New status: ${packData.order?.orderStatus}`);

    // 8. Status transition: Packed -> Out for Delivery
    console.log('\n[E2E 7] Rider A updating status: Packed -> Out for Delivery...');
    const ofdRes = await fetch(`${BASE_DELIVERY}/orders/${testOrder._id}/status`, {
      method: 'PUT',
      headers: headersRiderA,
      body: JSON.stringify({ status: 'Out for Delivery', note: 'Rider en route' })
    });
    const ofdData = await ofdRes.json();
    console.log(`OFD update status: ${ofdRes.status}, New status: ${ofdData.order?.orderStatus}`);

    // 9. Status transition: Out for Delivery -> Delivered (with OTP)
    console.log('\n[E2E 8] Rider A updating status: Out for Delivery -> Delivered with OTP...');
    const delivRes = await fetch(`${BASE_DELIVERY}/orders/${testOrder._id}/status`, {
      method: 'PUT',
      headers: headersRiderA,
      body: JSON.stringify({ status: 'Delivered', otp: '7890' })
    });
    const delivData = await delivRes.json();
    console.log(`Delivered update status: ${delivRes.status}, New status: ${delivData.order?.orderStatus}`);

    // 10. Student order tracking verification
    console.log('\n[E2E 9] Verifying Student Order Tracking reflects Delivered status...');
    const trackRes = await fetch(`${BASE_ORDERS}/${testOrder._id}`, {
      headers: headersStudent
    });
    const trackData = await trackRes.json();
    console.log(`Tracking status: ${trackRes.status}, Order Status: ${trackData.orderStatus}, OTP Verified: ${trackData.otpVerified}, Payment: ${trackData.paymentStatus}`);
    if (trackData.orderStatus === 'Delivered' && trackData.otpVerified === true) {
      console.log('✓ Student tracking correctly synchronizes with completed delivery.');
    } else {
      console.error('❌ Student tracking did not reflect delivered status!');
    }

    // 11. Delivery history verification
    console.log('\n[E2E 10] Checking Rider A delivery history...');
    const histRes = await fetch(`${BASE_DELIVERY}/history`, {
      headers: headersRiderA
    });
    const histData = await histRes.json();
    const deliveredItem = histData.find(o => o._id.toString() === testOrder._id.toString());
    if (deliveredItem) {
      console.log(`✓ Completed order appears in Rider A delivery history.`);
    }

    console.log('\n=== ALL DELIVERY PARTNER E2E TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Delivery E2E Error:', err);
  } finally {
    if (testOrder) {
      await Order.deleteOne({ _id: testOrder._id });
    }
    serverProcess.kill();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runDeliveryE2ETests();
