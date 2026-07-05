// lib/encryption/encrypt.ts
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-encryption-key-change-this-in-production';

// Encrypt data
export const encrypt = (text: string): string => {
  if (!text) return text;
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Fallback: return plain text
  }
};

// Decrypt data
export const decrypt = (ciphertext: string): string => {
  if (!ciphertext) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ciphertext; // If decryption returns empty, return original
  } catch (error) {
    console.error('Decryption error:', error);
    return ciphertext; // Fallback: return as is
  }
};

// Check if string is encrypted (rough check)
export const isEncrypted = (text: string): boolean => {
  if (!text) return false;
  try {
    // Check if it looks like encrypted data
    return text.includes('U2FsdGVkX1') || 
           (text.length > 50 && /^[A-Za-z0-9+/=]+$/.test(text));
  } catch {
    return false;
  }
};

// Generate a secure hash for fingerprinting
export const generateHash = (input: string): string => {
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
};