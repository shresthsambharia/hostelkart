import crypto from 'crypto';

/**
 * Decodes a base32 encoded string to a Buffer.
 * Compatible with standard authenticator secret formatting.
 * @param {string} base32 - Base32 encoded string
 * @returns {Buffer} Decoded buffer
 */
export function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let clean = base32.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  const length = clean.length;
  let bits = 0;
  let value = 0;
  let index = 0;
  
  // Base32 maps 8 chars to 5 bytes
  const buffer = Buffer.alloc(Math.floor((length * 5) / 8));

  for (let i = 0; i < length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) {
      throw new Error(`Invalid base32 character: ${clean[i]}`);
    }
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      buffer[index++] = (value >> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return buffer;
}

/**
 * Generates a random base32 encoded secret key.
 * @param {number} length - Length of secret to generate (default: 32)
 * @returns {string} Base32 encoded secret key
 */
export function generateSecret(length = 32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet[randomBytes[i] % alphabet.length];
  }
  return result;
}

/**
 * Calculates a HMAC-based One-Time Password (HOTP) for a given counter.
 * @param {Buffer} secretBuffer - Decoded secret key buffer
 * @param {number} counter - The integer counter value
 * @returns {string} 6-digit OTP code
 */
export function generateHOTP(secretBuffer, counter) {
  // Create an 8-byte big-endian buffer for the counter
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  // Calculate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const hmacResult = hmac.digest();

  // Dynamic truncation (RFC 4226 Section 5.4)
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const token = code % 1000000;
  return token.toString().padStart(6, '0');
}

/**
 * Verifies a Time-based One-Time Password (TOTP).
 * Allows checking a window of time steps to account for clock drift.
 * @param {string} token - The 6-digit TOTP code entered by the user
 * @param {string} secretBase32 - Base32 encoded secret key
 * @param {number} window - Lookback/lookahead window size in intervals (default: 1, i.e., +/- 30s)
 * @param {number} timeStepSeconds - Step interval in seconds (default: 30)
 * @returns {boolean} True if token matches, false otherwise
 */
export function verifyTOTP(token, secretBase32, window = 1, timeStepSeconds = 30) {
  if (!token || !secretBase32) return false;
  try {
    const secretBuffer = base32Decode(secretBase32);
    const currentCounter = Math.floor(Date.now() / 1000 / timeStepSeconds);

    for (let i = -window; i <= window; i++) {
      const calculated = generateHOTP(secretBuffer, currentCounter + i);
      if (calculated === token.trim()) {
        return true;
      }
    }
  } catch (error) {
    console.error('TOTP verification error:', error);
  }
  return false;
}

/**
 * Generates one-time recovery codes for account backup.
 * Format: XXXX-XXXX
 * @param {number} count - Number of recovery codes to generate
 * @returns {string[]} Array of alphanumeric recovery codes
 */
export function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${code.substring(0, 4)}-${code.substring(4, 8)}`;
    codes.push(formatted);
  }
  return codes;
}
