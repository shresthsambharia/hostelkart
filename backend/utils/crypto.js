import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

let encryptionKey = null;
function getEncryptionKey() {
  if (!encryptionKey) {
    const SECRET = process.env.JWT_SECRET || 'fallback-secret-key-32-chars-long-minimum';
    encryptionKey = crypto.scryptSync(SECRET, 'hostelkart-salt', 32);
  }
  return encryptionKey;
}

/**
 * Encrypt a string using AES-256-CBC.
 * @param {string} text - Plain text to encrypt.
 * @returns {string} Encrypted string in format iv:encryptedtext
 */
export function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string encrypted with AES-256-CBC.
 * @param {string} text - Encrypted text in format iv:encryptedtext
 * @returns {string} Decrypted plain text.
 */
export function decrypt(text) {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return '';
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const cipherKey = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, cipherKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Decryption Error]: Failed to decrypt secret', error);
    return '';
  }
}
