const User = require('../models/User');
const walletUtils = require('../utils/wallet');
const encryption = require('../utils/encryption');
const logger = require('../utils/logger');
const transactionService = require('./transactionService');

/**
 * Register a new user with phone number and PIN
 * @param {string} phoneNumber - Phone number with country code
 * @param {string} pin - User's chosen PIN
 * @returns {Promise<Object>} The created user
 */
const registerUser = async (phoneNumber, pin) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    
    if (existingUser && existingUser.isVerified) {
      throw new Error('User already exists');
    }
    
    // Create a new wallet or use the existing one if the user was created as a recipient
    let user = existingUser;
    
    if (!user) {
      // Create a new wallet for the user
      const { encryptedSecretKey, publicKey } = walletUtils.createEncryptedWallet();
      
      // Hash the PIN
      const hashedPin = encryption.hashPin(pin);
      
      // Create the user
      user = new User({
        phoneNumber,
        encryptedWalletKey: encryptedSecretKey,
        walletAddress: publicKey,
        pin: hashedPin,
        isVerified: true,
      });
      
      await user.save();
      logger.info(`Created new user with phone number ${phoneNumber}`);
    } else {
      // Update the existing user
      user.pin = encryption.hashPin(pin);
      user.isVerified = true;
      user.lastActivity = Date.now();
      
      await user.save();
      logger.info(`Updated existing user with phone number ${phoneNumber}`);
    }
    
    // Update user balances (this will pull actual on-chain balances)
    await transactionService.updateUserBalances(user._id);
    
    return user;
  } catch (error) {
    logger.error(`Failed to register user: ${error.message}`);
    throw error;
  }
};

/**
 * Verify a user's PIN
 * @param {string} phoneNumber - Phone number with country code
 * @param {string} pin - User's PIN
 * @returns {Promise<boolean>} Whether the PIN is correct
 */
const verifyUserPin = async (phoneNumber, pin) => {
  try {
    const user = await User.findOne({ phoneNumber });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.isLocked) {
      throw new Error('Account is locked due to too many failed attempts');
    }
    
    const isPinValid = encryption.verifyPin(pin, user.pin);
    
    if (!isPinValid) {
      // Increment PIN failure attempts
      user.pinFailAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.pinFailAttempts >= 5) {
        user.isLocked = true;
        logger.warn(`Account locked for ${phoneNumber} due to too many failed PIN attempts`);
      }
      
      await user.save();
      
      return false;
    }
    
    // Reset PIN failure attempts on successful verification
    user.pinFailAttempts = 0;
    user.lastActivity = Date.now();
    await user.save();
    
    return true;
  } catch (error) {
    logger.error(`Failed to verify PIN: ${error.message}`);
    throw error;
  }
};

/**
 * Get user by phone number
 * @param {string} phoneNumber - Phone number with country code
 * @returns {Promise<Object>} The user object
 */
const getUserByPhone = async (phoneNumber) => {
  try {
    const user = await User.findOne({ phoneNumber });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    logger.error(`Failed to get user: ${error.message}`);
    throw error;
  }
};

/**
 * Get user token balances
 * @param {string} phoneNumber - Phone number with country code
 * @returns {Promise<Object>} Object with token balances
 */
const getUserBalances = async (phoneNumber) => {
  try {
    const user = await getUserByPhone(phoneNumber);
    
    // Update balances from blockchain to ensure they're current
    await transactionService.updateUserBalances(user._id);
    
    // Get updated user
    const updatedUser = await User.findById(user._id);
    
    return updatedUser.tokenBalances;
  } catch (error) {
    logger.error(`Failed to get balances: ${error.message}`);
    throw error;
  }
};

module.exports = {
  registerUser,
  verifyUserPin,
  getUserByPhone,
  getUserBalances,
}; 