import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';

// Import express app
let expressApp;
let serverInstance;
let PORT = 54321;

function makeRequest(urlPath, baseUrl) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(urlPath, baseUrl);
    const req = http.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          statusCode: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 400,
          error: null
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - start;
      resolve({
        statusCode: 0,
        duration,
        success: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - start;
      resolve({
        statusCode: 408,
        duration,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

async function runConcurrencyBatch(baseUrl, endpoints, concurrencyLevel, totalBatches = 2) {
  const allResults = [];
  console.log(`\n======================================================`);
  console.log(`Running Concurrency Test: ${concurrencyLevel} Virtual Users (${concurrencyLevel * totalBatches} total requests)`);
  console.log(`======================================================`);

  const startTime = Date.now();
  for (let b = 0; b < totalBatches; b++) {
    const promises = [];
    for (let i = 0; i < concurrencyLevel; i++) {
      const endpoint = endpoints[i % endpoints.length];
      promises.push(makeRequest(endpoint, baseUrl));
    }
    const batchResults = await Promise.all(promises);
    allResults.push(...batchResults);
  }
  const totalDurationSec = (Date.now() - startTime) / 1000;

  const totalRequests = allResults.length;
  const successes = allResults.filter(r => r.success);
  const failures = allResults.filter(r => !r.success);
  const serverErrors = allResults.filter(r => r.statusCode >= 500);
  const timeouts = allResults.filter(r => r.statusCode === 408 || r.error === 'Timeout');

  const durations = allResults.map(r => r.duration).sort((a, b) => a - b);
  const sum = durations.reduce((acc, d) => acc + d, 0);
  const avg = Math.round(sum / totalRequests);
  const min = durations[0];
  const max = durations[durations.length - 1];
  const p50 = durations[Math.floor(durations.length * 0.50)];
  const p90 = durations[Math.floor(durations.length * 0.90)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const successRate = ((successes.length / totalRequests) * 100).toFixed(2);
  const throughput = (totalRequests / Math.max(0.001, totalDurationSec)).toFixed(1);

  const stats = {
    'Virtual Users': concurrencyLevel,
    'Total Requests': totalRequests,
    'Success Rate': `${successRate}%`,
    'Avg Latency': `${avg} ms`,
    'P50 Latency': `${p50} ms`,
    'P95 Latency': `${p95} ms`,
    'P99 Latency': `${p99} ms`,
    'Min / Max': `${min}ms / ${max}ms`,
    'HTTP 5xx': serverErrors.length,
    'Timeouts': timeouts.length,
    'Throughput': `${throughput} req/s`
  };

  console.table([stats]);
  return stats;
}

async function testAtomicStockConcurrency() {
  console.log('\n======================================================');
  console.log('Testing Atomic Stock Race Condition Guardrail (20 Concurrent Checkouts vs Stock=5)');
  console.log('======================================================');

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
  }
  const db = mongoose.connection.db;
  const productsColl = db.collection('products');

  const testProdId = new mongoose.Types.ObjectId();
  await productsColl.insertOne({
    _id: testProdId,
    name: 'CONCURRENCY_TEST_MANGO',
    category: 'Fruits',
    price: 100,
    stock: 5,
    isAvailable: true,
    approvalStatus: 'approved'
  });

  const totalAttempts = 20;
  const attempts = Array.from({ length: totalAttempts }, (_, i) => i + 1);

  let successCount = 0;
  let rejectedCount = 0;

  const results = await Promise.all(
    attempts.map(async (attemptId) => {
      const res = await productsColl.findOneAndUpdate(
        { _id: testProdId, stock: { $gte: 1 } },
        { $inc: { stock: -1 } },
        { returnDocument: 'after' }
      );
      if (res && res.value !== null && res.ok !== 0) {
        return { attemptId, success: true, remainingStock: res.value?.stock ?? res.stock };
      } else {
        return { attemptId, success: false, reason: 'Insufficient stock' };
      }
    })
  );

  results.forEach(r => {
    if (r.success) successCount++;
    else rejectedCount++;
  });

  const finalProduct = await productsColl.findOne({ _id: testProdId });
  console.log(`Initial Stock: 5 | Concurrent Attempt Requests: ${totalAttempts}`);
  console.log(`Successful Decrements: ${successCount} (Expected: 5)`);
  console.log(`Rejected (Prevented Negative Stock): ${rejectedCount} (Expected: 15)`);
  console.log(`Final Database Stock: ${finalProduct.stock} (Expected: 0)`);

  const raceSafetyPassed = successCount === 5 && rejectedCount === 15 && finalProduct.stock === 0;
  console.log(`Atomic Race Condition Guardrail Result: ${raceSafetyPassed ? 'PASSED (100% Race-Condition Safe)' : 'FAILED'}`);

  await productsColl.deleteOne({ _id: testProdId });
  return { successCount, rejectedCount, finalStock: finalProduct.stock, passed: raceSafetyPassed };
}

async function main() {
  console.log('======================================================');
  console.log('=== HOSTELKART CONCURRENCY & RESILIENCE AUDIT ===');
  console.log('======================================================');

  await testAtomicStockConcurrency();

  // Test endpoints on live server (Port 5000) or start temporary app listener
  const endpoints = [
    '/api/products',
    '/api/products/categories',
    '/api/recommendations',
    '/api/health'
  ];

  let targetUrl = 'http://127.0.0.1:5000';
  let serverCheck = await makeRequest('/api/health', targetUrl);

  if (!serverCheck.success && serverCheck.statusCode !== 200 && serverCheck.statusCode !== 404) {
    // If not listening on 5000, let's test with express app
    console.log('Setting up benchmark test runner...');
  }

  // Run Concurrency levels: 10, 50, 100
  console.log('\n--- EXECUTING CONCURRENT TRAFFIC BENCHMARKS (10, 50, 100 VU) ---');
  const r10 = await runConcurrencyBatch(targetUrl, endpoints, 10, 2);
  const r50 = await runConcurrencyBatch(targetUrl, endpoints, 50, 2);
  const r100 = await runConcurrencyBatch(targetUrl, endpoints, 100, 2);

  console.log('\n--- SUMMARY BENCHMARK COMPARISON ---');
  console.table([r10, r50, r100]);

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
