import { strict as assert } from 'assert';
import { generateSecret, base32Decode, generateHOTP, verifyTOTP, generateRecoveryCodes } from '../utils/totp.js';
import { getOptimizedImageUrl, getSrcSet } from '../../frontend/src/utils/image.js';

export function runBackendTests() {
  console.log('--- Running Backend Unit Tests ---');

  // Test 1: TOTP Secret Generation
  const secret = generateSecret();
  assert.equal(typeof secret, 'string', 'Secret should be base32 string');
  assert.equal(secret.length, 32, 'Secret should be 32 chars');
  console.log('✓ TOTP Secret Generation passed.');

  // Test 2: Base32 decoding
  const buffer = base32Decode(secret);
  assert.ok(Buffer.isBuffer(buffer), 'Decoded output should be a buffer');
  console.log('✓ Base32 Decode passed.');

  // Test 3: HOTP generation and TOTP verification
  const hotp = generateHOTP(buffer, 123456);
  assert.equal(hotp.length, 6, 'OTP code should be 6 digits');
  console.log('✓ HOTP Generation passed.');

  // Test 4: TOTP Recovery codes
  const recovery = generateRecoveryCodes(5);
  assert.equal(recovery.length, 5, 'Should generate 5 codes');
  assert.ok(recovery[0].includes('-'), 'Codes should contain hyphen spacer');
  console.log('✓ Recovery Codes passed.');

  // Test 5: Image Optimization CDN Parameters Injector
  const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v12345/sample.jpg';
  const optUrl = getOptimizedImageUrl(cloudinaryUrl, 500);
  assert.ok(optUrl.includes('f_auto'), 'Optimized URL should inject format auto');
  assert.ok(optUrl.includes('w_500'), 'Optimized URL should inject width');
  assert.ok(optUrl.includes('fl_progressive'), 'Optimized URL should inject progressive loading');
  console.log('✓ Image Optimization CDN URL checks passed.');

  // Test 6: Image SrcSet breakpoints array
  const srcSet = getSrcSet(cloudinaryUrl);
  assert.ok(srcSet.includes('150w'), 'SrcSet should support 150px');
  assert.ok(srcSet.includes('1600w'), 'SrcSet should support 1600px');
  console.log('✓ Image SrcSet breakpoints checks passed.');

  console.log('✓ All Backend tests completed successfully!');
  return true;
}
