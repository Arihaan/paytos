const CryptoJS = require('crypto-js');
const config = require('../../config/config');

/**
 * Encrypts a text using AES encryption
 * @param {string} text - The text to encrypt
 * @returns {string} The encrypted text
 */
const encrypt = (text) => {
  if (!config.encryption.key) {
    throw new Error('Encryption key is not set');
  }
  return CryptoJS.AES.encrypt(text, config.encryption.key).toString();
};

/**
 * Decrypts an encrypted text using AES decryption
 * @param {string} ciphertext - The encrypted text
 * @returns {string} The decrypted text
 */
const decrypt = (ciphertext) => {
  if (!config.encryption.key) {
    throw new Error('Encryption key is not set');
  }
  const bytes = CryptoJS.AES.decrypt(ciphertext, config.encryption.key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Hash a PIN for secure storage
 * @param {string} pin - The PIN to hash
 * @returns {string} The hashed PIN
 */
const hashPin = (pin) => {
  return CryptoJS.SHA256(pin + config.encryption.key).toString();
};

/**
 * Verify if a PIN matches the stored hash
 * @param {string} pin - The PIN to verify
 * @param {string} hashedPin - The stored hashed PIN
 * @returns {boolean} Whether the PIN matches
 */
const verifyPin = (pin, hashedPin) => {
  return hashPin(pin) === hashedPin;
};

module.exports = {
  encrypt,
  decrypt,
  hashPin,
  verifyPin,
}; 