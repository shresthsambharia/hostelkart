import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { generateSecret, verifyTOTP, generateHOTP, base32Decode, generateRecoveryCodes } from '../utils/totp.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const runTest = async () => {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart');
  console.log('Database connected successfully.');

  // Find admin user
  const admin = await User.findOne({ email: 'admin@hostelkart.com' });
  if (!admin) {
    console.error('Error: Admin user not found! Run npm run seed first.');
    process.exit(1);
  }
  console.log(`Found admin user: ${admin.email}`);

  // Reset 2FA fields
  console.log('Resetting 2FA fields for test...');
  admin.twoFactorEnabled = false;
  admin.twoFactorSecret = '';
  admin.twoFactorTempSecret = '';
  admin.twoFactorRecoveryCodes = [];
  await admin.save();

  // Test 1: Secret Generation
  console.log('\n--- Test 1: Secret Generation ---');
  const secret = generateSecret();
  console.log(`Generated secret (base32): ${secret}`);
  if (secret.length !== 32) {
    throw new Error('Secret length should be 32 characters');
  }
  console.log('Test 1 Passed.');

  // Test 2: Crypto Utility (Encryption & Decryption)
  console.log('\n--- Test 2: Crypto Encryption/Decryption ---');
  const encrypted = encrypt(secret);
  console.log(`Encrypted secret: ${encrypted}`);
  const decrypted = decrypt(encrypted);
  console.log(`Decrypted secret: ${decrypted}`);
  if (decrypted !== secret) {
    throw new Error('Encryption/decryption mismatch!');
  }
  console.log('Test 2 Passed.');

  // Test 3: TOTP Code Calculation & Verification
  console.log('\n--- Test 3: TOTP Verification ---');
  // Generate code for current counter
  const secretBuffer = base32Decode(secret);
  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  const code = generateHOTP(secretBuffer, currentCounter);
  console.log(`Calculated TOTP code for current counter: ${code}`);

  const isValid = verifyTOTP(code, secret);
  console.log(`Verification result for correct code: ${isValid}`);
  if (!isValid) {
    throw new Error('Correct code verification failed!');
  }

  const isInvalid = verifyTOTP('123456', secret);
  console.log(`Verification result for incorrect code (123456): ${isInvalid}`);
  if (isInvalid) {
    throw new Error('Incorrect code verification incorrectly succeeded!');
  }
  console.log('Test 3 Passed.');

  // Test 4: Recovery Codes Generation and Verification
  console.log('\n--- Test 4: Recovery Codes ---');
  const recoveryCodes = generateRecoveryCodes(8);
  console.log(`Generated recovery codes:`, recoveryCodes);
  if (recoveryCodes.length !== 8) {
    throw new Error('Recovery codes length should be 8');
  }

  const hashedCodes = await Promise.all(recoveryCodes.map(c => bcrypt.hash(c, 10)));
  admin.twoFactorRecoveryCodes = hashedCodes;
  admin.twoFactorSecret = encrypted;
  admin.twoFactorEnabled = true;
  await admin.save();
  console.log('Saved recovery codes to DB.');

  // Test verification of one recovery code
  const testCode = recoveryCodes[2]; // e.g. third code
  console.log(`Testing verification of recovery code: ${testCode}`);
  
  let codeIndex = -1;
  for (let i = 0; i < admin.twoFactorRecoveryCodes.length; i++) {
    const isMatch = await bcrypt.compare(testCode, admin.twoFactorRecoveryCodes[i]);
    if (isMatch) {
      codeIndex = i;
      break;
    }
  }

  console.log(`Recovery code match index: ${codeIndex}`);
  if (codeIndex === -1) {
    throw new Error('Recovery code verification failed!');
  }

  // Remove the code
  admin.twoFactorRecoveryCodes.splice(codeIndex, 1);
  await admin.save();
  console.log(`Successfully used and removed recovery code. Remaining count: ${admin.twoFactorRecoveryCodes.length}`);
  if (admin.twoFactorRecoveryCodes.length !== 7) {
    throw new Error('Used recovery code was not removed!');
  }
  console.log('Test 4 Passed.');

  // Test 4.5: Regenerating Recovery Codes
  console.log('\n--- Test 4.5: Regenerating Recovery Codes ---');
  const newRecoveryCodes = generateRecoveryCodes(8);
  console.log(`Generated new recovery codes:`, newRecoveryCodes);
  if (newRecoveryCodes.length !== 8) {
    throw new Error('Regenerated recovery codes length should be 8');
  }
  admin.twoFactorRecoveryCodes = await Promise.all(newRecoveryCodes.map(c => bcrypt.hash(c, 10)));
  await admin.save();
  console.log('Saved regenerated recovery codes to DB.');

  // Test verification of one new recovery code
  const testNewCode = newRecoveryCodes[4];
  let newCodeIndex = -1;
  for (let i = 0; i < admin.twoFactorRecoveryCodes.length; i++) {
    const isMatch = await bcrypt.compare(testNewCode, admin.twoFactorRecoveryCodes[i]);
    if (isMatch) {
      newCodeIndex = i;
      break;
    }
  }
  console.log(`New recovery code match index: ${newCodeIndex}`);
  if (newCodeIndex === -1) {
    throw new Error('New recovery code verification failed!');
  }
  console.log('Test 4.5 Passed.');

  // Test 5: Disabling 2FA
  console.log('\n--- Test 5: Disable 2FA ---');
  admin.twoFactorEnabled = false;
  admin.twoFactorSecret = '';
  admin.twoFactorRecoveryCodes = [];
  await admin.save();
  console.log('Disabled 2FA in user document.');
  
  const updatedAdmin = await User.findById(admin._id);
  if (updatedAdmin.twoFactorEnabled || updatedAdmin.twoFactorSecret !== '') {
    throw new Error('Disable 2FA did not clear the fields correctly!');
  }
  console.log('Test 5 Passed.');

  console.log('\n=========================================');
  console.log('ALL BACKEND 2FA TESTS PASSED SUCCESSFULLY!');
  console.log('=========================================');

  mongoose.connection.close();
  process.exit(0);
};

runTest().catch((error) => {
  console.error('\nTest failed with error:', error);
  mongoose.connection.close();
  process.exit(1);
});
