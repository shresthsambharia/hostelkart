import { runBackendTests } from './tests/backend.test.js';
import { runDietPlannerTests } from './tests/dietPlanner.test.js';
import { runDeliveryPartnerTests } from './tests/deliveryPartner.test.js';
import { runAdminTests } from './tests/admin.test.js';
import { runSupplierTests } from './tests/supplier.test.js';
import { runSystemIntegrationTests } from './test_system_integration.mjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import path from 'path';
import fs from 'fs';

const envPath = fs.existsSync('./backend/.env') ? './backend/.env' : './.env';
dotenv.config({ path: envPath });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';

try {
  await mongoose.connect(MONGO_URI);
  await runBackendTests();
  await runDietPlannerTests();
  await runDeliveryPartnerTests();
  await runAdminTests();
  await runSupplierTests();
  await runSystemIntegrationTests();
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error('Test execution failed:', err);
  process.exit(1);
}
