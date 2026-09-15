import { spawn } from 'child_process';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from './models/Product.js';

dotenv.config();

async function runProductionTests() {
  console.log('=== STARTING PACED PRODUCTION VERIFICATION CHAT TEST ===');

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB successfully.');

  const serverProcess = spawn(process.execPath, ['-r', 'dotenv/config', 'server.js'], {
    cwd: 'C:\\Users\\user\\.gemini\\antigravity\\scratch\\hostelkart\\backend',
    env: { ...process.env, PORT: '5003', NODE_ENV: 'development' }
  });

  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    if (text.includes('[AI TOOL]') || text.includes('[AI TOOL WARNING]') || text.includes('AI_TOOL_CALL')) {
      process.stdout.write(text);
    }
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  await new Promise((resolve) => setTimeout(resolve, 15000));
  console.log('✓ Backend server started on port 5003');

  const chatUrl = 'http://localhost:5003/api/ai/chat';
  const loginUrl = 'http://localhost:5003/api/auth/login';

  let studentToken = '';
  try {
    const studentRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@hostelkart.com', password: 'student123' })
    });
    const studentData = await studentRes.json();
    studentToken = studentData.token;
    console.log('✓ Logged in successfully.');
  } catch (err) {
    console.error('Login failed:', err.message);
  }

  // Helper to clear cart before tests
  const Cart = (await import('./models/Cart.js')).default;
  const User = (await import('./models/User.js')).default;
  let testUser = await User.findOne({ email: 'student@hostelkart.com' });
  if (testUser) {
    await Cart.deleteMany({ user: testUser._id });
    console.log('✓ Mock user cart cleared in database.');
  }

  async function queryChat(userText, useAuth = true) {
    console.log(`\n==================================================`);
    console.log(`[USER QUERY]: "${userText}" (Authenticated: ${useAuth})`);

    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'a'.repeat(64)
      };
      if (useAuth && studentToken) {
        headers['Authorization'] = `Bearer ${studentToken}`;
      }

      const res = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userText, history: [] })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`❌ HTTP Error:`, errText);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let responseText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                responseText += parsed.chunk;
              }
            } catch (err) {}
          }
        }
      }

      console.log('[ASSISTANT RESPONSE]:');
      console.log(responseText.trim());

    } catch (err) {
      console.error(`❌ Error during query:`, err.message);
    }
  }

  // Execute E2E Cart Verification Queries
  // Test 9: Unauthenticated
  await queryChat('Add Royal Gala Apple to my cart.', false);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Test 1: Add Royal Gala Apple (quantity = 1)
  await queryChat('Add Royal Gala Apple to my cart.', true);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Test 2: Add 3 bananas (quantity = 3)
  await queryChat('Add 3 bananas to my cart.', true);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Test 3: Add pineapple (no apples)
  await queryChat('Add pineapple to my cart.', true);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Test 4: Add apple (ambiguous match clarification prompt)
  await queryChat('Add apple to my cart.', true);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Test 5: What's in my cart?
  await queryChat("What's in my cart?", true);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Test 7: Change bananas to 5
  await queryChat('Change bananas to 5.', true);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Test 8: Add 100 apples
  await queryChat('Add 100 apples.', true);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Test 6: Remove Royal Gala Apple
  await queryChat('Remove Royal Gala Apple from my cart.', true);
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Final check of cart in database
  if (testUser) {
    const finalCart = await Cart.findOne({ user: testUser._id }).populate('items.product');
    console.log('\n==================================================');
    console.log('=== FINAL DATABASE CART AUDIT ===');
    finalCart.items.forEach(item => {
      console.log(`- ${item.product.name} (Quantity: ${item.quantity})`);
    });
  }

  serverProcess.kill();
  await mongoose.disconnect();
  console.log('\n=== PRODUCTION VERIFICATION FINISHED ===');
  process.exit(0);
}

runProductionTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
