// lib/encryption/encrypt.ts
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this';

// Encrypt data
export const encrypt = (text: string): string => {
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Fallback: return plain text
  }
};

// Decrypt data
export const decrypt = (ciphertext: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return ciphertext; // Fallback: return as is
  }
};

// Check if string is encrypted (rough check)
export const isEncrypted = (text: string): boolean => {
  try {
    // Check if it looks like encrypted data
    return text.includes('U2FsdGVkX1') || text.length > 50 && /^[A-Za-z0-9+/=]+$/.test(text);
  } catch {
    return false;
  }
};