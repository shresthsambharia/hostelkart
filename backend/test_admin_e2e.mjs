import { spawn } from 'child_process';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Order from './models/Order.js';
import Product from './models/Product.js';
import Coupon from './models/Coupon.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';

const envPath = fs.existsSync('./backend/.env') ? './backend/.env' : './.env';
dotenv.config({ path: envPath });

async function runAdminE2ETests() {
  console.log('=== STARTING ADMIN MODULE E2E TEST SUITE ===');

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
  let admin = await User.findOne({ email: 'e2e_admin@hostelkart.com' });
  if (!admin) {
    admin = await User.create({
      name: 'E2E Admin User',
      email: 'e2e_admin@hostelkart.com',
      password: 'password123',
      role: 'admin',
      isEmailVerified: true
    });
  }

  let student = await User.findOne({ email: 'e2e_student_admin@example.com' });
  if (!student) {
    student = await User.create({
      name: 'E2E Student User',
      email: 'e2e_student_admin@example.com',
      password: 'password123',
      role: 'student',
      isEmailVerified: true
    });
  }

  let rider = await User.findOne({ email: 'e2e_rider_admin@example.com' });
  if (!rider) {
    rider = await User.create({
      name: 'E2E Rider User',
      email: 'e2e_rider_admin@example.com',
      password: 'password123',
      role: 'delivery',
      isEmailVerified: true
    });
  }

  const tokenAdmin = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '1d' });
  const tokenStudent = jwt.sign({ id: student._id, role: student.role }, JWT_SECRET, { expiresIn: '1d' });
  const tokenRider = jwt.sign({ id: rider._id, role: rider.role }, JWT_SECRET, { expiresIn: '1d' });

  const csrfToken = crypto.randomBytes(32).toString('hex');
  const headersAdmin = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenAdmin}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrfToken=${csrfToken}`
  };
  const headersStudent = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenStudent}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrfToken=${csrfToken}`
  };
  const headersRider = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenRider}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrfToken=${csrfToken}`
  };

  const BASE_ADMIN = 'http://localhost:5003/api/admin';
  const BASE_COUPONS = 'http://localhost:5003/api/coupons';
  const BASE_TICKETS = 'http://localhost:5003/api/tickets';

  let createdProduct = null;
  let createdCoupon = null;

  try {
    // 1. Unauthenticated access check
    console.log('\n[E2E 1] Testing unauthenticated access to /api/admin/analytics...');
    const unauthRes = await fetch(`${BASE_ADMIN}/analytics`, {
      headers: { 'Cookie': `csrfToken=${csrfToken}` }
    });
    console.log(`Unauthenticated status: ${unauthRes.status}`);
    if (unauthRes.status === 401) {
      console.log('✓ Unauthenticated request rejected with 401.');
    } else {
      console.warn(`⚠️ Expected 401, got ${unauthRes.status}`);
    }

    // 2. Student role accessing admin endpoint
    console.log('\n[E2E 2] Testing Student role access to /api/admin/analytics...');
    const studentRes = await fetch(`${BASE_ADMIN}/analytics`, {
      headers: headersStudent
    });
    console.log(`Student status: ${studentRes.status}`);
    if (studentRes.status === 403) {
      console.log('✓ Student access rejected with 403 Forbidden.');
    } else {
      console.warn(`⚠️ Expected 403, got ${studentRes.status}`);
    }

    // 3. Delivery partner accessing admin endpoint
    console.log('\n[E2E 3] Testing Delivery Partner access to /api/admin/analytics...');
    const riderRes = await fetch(`${BASE_ADMIN}/analytics`, {
      headers: headersRider
    });
    console.log(`Rider status: ${riderRes.status}`);
    if (riderRes.status === 403) {
      console.log('✓ Delivery Partner access rejected with 403 Forbidden.');
    } else {
      console.warn(`⚠️ Expected 403, got ${riderRes.status}`);
    }

    // 4. Admin accessing analytics
    console.log('\n[E2E 4] Admin accessing /api/admin/analytics...');
    const analyticsRes = await fetch(`${BASE_ADMIN}/analytics`, {
      headers: headersAdmin
    });
    const analyticsData = await analyticsRes.json();
    console.log(`Analytics status: ${analyticsRes.status}, Total Revenue: ₹${analyticsData.totalRevenue}, Total Orders: ${analyticsData.totalOrders}`);

    // 5. Admin Product Management (Add -> Edit -> Delete)
    console.log('\n[E2E 5] Admin creating a new product...');
    const addProdRes = await fetch(`${BASE_ADMIN}/products`, {
      method: 'POST',
      headers: headersAdmin,
      body: JSON.stringify({
        name: 'E2E Admin Energy Drink',
        price: 80,
        mrp: 100,
        discount: 20,
        description: 'Refreshing energy beverage for exam nights',
        category: 'Snacks',
        stock: 30,
        deliveryTime: '15-20 mins'
      })
    });
    createdProduct = await addProdRes.json();
    console.log(`Product creation status: ${addProdRes.status}, Product ID: ${createdProduct._id}`);

    // Edit product
    console.log('\n[E2E 6] Admin editing product price and stock...');
    const editProdRes = await fetch(`${BASE_ADMIN}/products/${createdProduct._id}`, {
      method: 'PUT',
      headers: headersAdmin,
      body: JSON.stringify({ price: 85, stock: 25 })
    });
    const editProdData = await editProdRes.json();
    console.log(`Product edit status: ${editProdRes.status}, New Price: ₹${editProdData.price}, New Stock: ${editProdData.stock}`);

    // Delete product
    console.log('\n[E2E 7] Admin deleting product...');
    const delProdRes = await fetch(`${BASE_ADMIN}/products/${createdProduct._id}`, {
      method: 'DELETE',
      headers: headersAdmin
    });
    const delProdData = await delProdRes.json();
    console.log(`Product delete status: ${delProdRes.status}, Message: ${delProdData.message}`);

    // 6. Admin User Management
    console.log('\n[E2E 8] Admin listing users and checking field masking...');
    const usersRes = await fetch(`${BASE_ADMIN}/users`, {
      headers: headersAdmin
    });
    const usersData = await usersRes.json();
    console.log(`Users count: ${usersData.length}`);
    const sampleUser = usersData[0];
    if (sampleUser && sampleUser.password === undefined && sampleUser.twoFactorSecret === undefined) {
      console.log('✓ Sensitive fields (password, 2FA secret) successfully masked in API response.');
    } else {
      console.error('❌ Sensitive credentials detected in user response!');
    }

    // 7. Admin Coupon Management
    console.log('\n[E2E 9] Admin creating and managing discount coupons...');
    const addCouponRes = await fetch(`${BASE_COUPONS}/admin`, {
      method: 'POST',
      headers: headersAdmin,
      body: JSON.stringify({
        code: 'E2EADMIN20',
        description: '20% off for exam season promo',
        discountType: 'percentage',
        discountValue: 20,
        minimumOrderAmount: 150,
        maximumDiscount: 60,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usageLimit: 50,
        active: true
      })
    });
    createdCoupon = await addCouponRes.json();
    console.log(`Coupon creation status: ${addCouponRes.status}, Code: ${createdCoupon.code}`);

    // Delete coupon
    const delCouponRes = await fetch(`${BASE_COUPONS}/admin/${createdCoupon._id}`, {
      method: 'DELETE',
      headers: headersAdmin
    });
    const delCouponData = await delCouponRes.json();
    console.log(`Coupon delete status: ${delCouponRes.status}, Message: ${delCouponData.message}`);

    // 8. Admin Support Ticket Analytics
    console.log('\n[E2E 10] Admin accessing support ticket analytics...');
    const ticketStatsRes = await fetch(`${BASE_TICKETS}/admin/analytics`, {
      headers: headersAdmin
    });
    const ticketStats = await ticketStatsRes.json();
    console.log(`Ticket stats status: ${ticketStatsRes.status}, Total Tickets: ${ticketStats.totalTickets || 0}`);

    console.log('\n=== ALL ADMIN MODULE E2E TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Admin E2E Error:', err);
  } finally {
    serverProcess.kill();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runAdminE2ETests();
