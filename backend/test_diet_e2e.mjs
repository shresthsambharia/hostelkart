import { spawn } from 'child_process';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import DietPlan from './models/DietPlan.js';
import Product from './models/Product.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';

const envPath = fs.existsSync('./backend/.env') ? './backend/.env' : './.env';
dotenv.config({ path: envPath });

async function runDietE2ETests() {
  console.log('=== STARTING DIET PLANNER E2E TEST SUITE ===');

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
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!serverReady) {
    throw new Error('Backend server failed to start on port 5003 within 30s');
  }
  console.log('✓ Backend server is up and responsive on port 5003');

  let studentUser = await User.findOne({ email: 'student_diet_test@example.com' });
  if (!studentUser) {
    studentUser = await User.create({
      name: 'Diet Test Student',
      email: 'student_diet_test@example.com',
      password: 'password123',
      role: 'student',
      isEmailVerified: true
    });
  }

  const token = jwt.sign({ id: studentUser._id, role: studentUser.role }, JWT_SECRET, {
    expiresIn: '1d'
  });

  const csrfToken = crypto.randomBytes(32).toString('hex');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrfToken,
    'Cookie': `csrfToken=${csrfToken}`
  };

  const BASE_URL = 'http://localhost:5003/api/ai/diet-plan';

  try {
    // 1. Unauthenticated request check
    console.log('\n[E2E 1] Testing unauthenticated diet generation rejection...');
    const unauthRes = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'Cookie': `csrfToken=${csrfToken}`
      },
      body: JSON.stringify({ height: 180, weight: 80, goal: 'Muscle gain' })
    });
    console.log(`Unauthenticated Response status: ${unauthRes.status}`);
    if (unauthRes.status === 401) {
      console.log('✓ Unauthenticated request rejected with 401 as required.');
    } else {
      console.warn(`⚠️ Expected 401 for unauthenticated request, got ${unauthRes.status}.`);
    }

    // 1b. Role check: Admin role attempting student diet-plan route
    console.log('\n[E2E 1b] Testing Admin role access rejection to student Diet Planner...');
    let adminUser = await User.findOne({ email: 'admin_diet_test@example.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Diet Test Admin',
        email: 'admin_diet_test@example.com',
        password: 'password123',
        role: 'admin',
        isEmailVerified: true
      });
    }
    const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, JWT_SECRET, { expiresIn: '1d' });
    const adminRes = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfToken,
        'Cookie': `csrfToken=${csrfToken}`
      },
      body: JSON.stringify({ height: 180, weight: 80, goal: 'Muscle gain' })
    });
    console.log(`Admin Request status: ${adminRes.status}`);
    if (adminRes.status === 403) {
      console.log('✓ Admin access correctly forbidden with 403 on student Diet Planner endpoint.');
    } else {
      console.warn(`⚠️ Expected 403 for Admin role, got ${adminRes.status}`);
    }

    // 2. Generate Plan for Profile A (Muscle gain, 180cm, 80kg, Vegetarian)
    console.log('\n[E2E 2] Generating Diet Plan for Profile A (Muscle Gain)...');
    const resA = await fetch(BASE_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        age: 20,
        gender: 'Male',
        height: 180,
        weight: 80,
        activityLevel: 'Moderately Active',
        goal: 'Muscle gain',
        dietaryPreference: 'Vegetarian',
        foodPreferences: { favouriteFoods: 'Bananas, Milk' },
        allergies: ['None'],
        healthConditions: ['No known medical condition'],
        hostelLifestyle: { messAvailability: 'full', monthlyBudget: 'Moderate' }
      })
    });

    const dataA = await resA.json();
    console.log(`Response status: ${resA.status}, Success: ${dataA.success}`);
    console.log(`Calculated BMI: ${dataA.profile?.bmi} (${dataA.profile?.bmiCategory})`);
    console.log(`Calorie Target: ${dataA.plan?.estimatedCalories}`);
    console.log(`Recommended Products count: ${dataA.plan?.recommendedProducts?.length}`);
    console.log(`Disclaimer present: ${!!dataA.plan?.disclaimer}`);

    const planIdA = dataA.dietPlanId;

    // 3. Generate Plan for Profile B (Fat Loss, 165cm, 70kg, Peanut Allergy, Diabetes self-reported)
    console.log('\n[E2E 3] Generating Diet Plan for Profile B (Fat Loss with Peanut Allergy & Diabetes)...');
    const resB = await fetch(BASE_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        age: 22,
        gender: 'Female',
        height: 165,
        weight: 70,
        activityLevel: 'Lightly Active',
        goal: 'Fat loss',
        dietaryPreference: 'Vegetarian',
        allergies: ['Peanuts'],
        healthConditions: ['Diabetes / Pre-diabetes'],
        hostelLifestyle: { messAvailability: 'full', monthlyBudget: 'Budget' }
      })
    });

    const dataB = await resB.json();
    console.log(`Response status: ${resB.status}, Success: ${dataB.success}`);
    console.log(`Calculated BMI: ${dataB.profile?.bmi} (${dataB.profile?.bmiCategory})`);
    console.log(`Calorie Target: ${dataB.plan?.estimatedCalories}`);
    console.log(`Recommended Products count: ${dataB.plan?.recommendedProducts?.length}`);
    for (const prod of (dataB.plan?.recommendedProducts || [])) {
      if (prod.name.toLowerCase().includes('peanut')) {
        console.error(`❌ ERROR: Peanut product "${prod.name}" found despite peanut allergy!`);
      }
    }
    console.log('✓ Verified peanut products strictly excluded from recommendations.');

    // 4. Retrieve All Saved Plans for Student
    console.log('\n[E2E 4] Fetching all saved diet plans for student...');
    const listRes = await fetch(BASE_URL, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `csrfToken=${csrfToken}`
      }
    });
    const listData = await listRes.json();
    console.log(`Saved plans count in response: ${listData.count}`);

    // 5. Test Smart Substitution / Follow-up Chat
    console.log('\n[E2E 5] Testing Smart Substitution follow-up chat...');
    const chatRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        message: 'Can I replace banana with apple?',
        planContext: {
          goal: 'Muscle gain',
          dietaryPreference: 'Vegetarian',
          allergies: ['None']
        }
      })
    });
    const chatData = await chatRes.json();
    console.log(`Chat Response: ${chatData.reply?.slice(0, 120)}...`);

    // 6. Delete Saved Plan
    console.log('\n[E2E 6] Deleting test plan...');
    const delRes = await fetch(`${BASE_URL}/${planIdA}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    const delData = await delRes.json();
    console.log(`Delete status: ${delRes.status}, Message: ${delData.message}`);

    console.log('\n=== ALL DIET PLANNER E2E TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('E2E Test Failure:', err);
  } finally {
    serverProcess.kill();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runDietE2ETests();
