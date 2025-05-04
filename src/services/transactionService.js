const {
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} = require('@solana/web3.js');
const {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');
const config = require('../../config/config');
const walletUtils = require('../utils/wallet');
const logger = require('../utils/logger');
const User = require('../models/User');
const TransactionModel = require('../models/Transaction');
const PendingTransaction = require('../models/PendingTransaction');

/**
 * Update user token balances in the database
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const updateUserBalances = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user wallet
    const userWallet = walletUtils.decryptWallet(user.encryptedWalletKey);
    
    // Update SOL balance
    const solBalance = await walletUtils.checkTokenBalance(userWallet.publicKey, 'SOL');
    user.tokenBalances.SOL = solBalance;
    
    // Update other token balances
    const supportedTokens = ['USDC', 'USDT', 'PYUSD'];
    for (const token of supportedTokens) {
      const tokenBalance = await walletUtils.checkTokenBalance(userWallet.publicKey, token);
      user.tokenBalances[token] = tokenBalance;
    }
    
    await user.save();
    logger.info(`Updated balances for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to update balances for user ${userId}: ${error.message}`);
    throw error;
  }
};

/**
 * Transfer SOL from one wallet to another
 * @param {Object} senderWallet - Sender wallet object
 * @param {string} recipientAddress - Recipient public key
 * @param {number} amount - Amount to send in SOL
 * @returns {Promise<string>} Transaction signature
 */
const transferSol = async (senderWallet, recipientAddress, amount) => {
  try {
    const connection = walletUtils.getConnection();
    const recipient = new PublicKey(recipientAddress);
    
    // Convert SOL to lamports
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    
    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderWallet.keypair.publicKey,
        toPubkey: recipient,
        lamports,
      })
    );
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderWallet.keypair]
    );
    
    logger.info(`SOL transfer successful. Signature: ${signature}`);
    return signature;
  } catch (error) {
    logger.error(`SOL transfer failed: ${error.message}`);
    throw error;
  }
};

/**
 * Transfer a token from one wallet to another
 * @param {Object} senderWallet - Sender wallet object
 * @param {string} recipientAddress - Recipient public key
 * @param {number} amount - Amount to send
 * @param {string} token - Token symbol
 * @returns {Promise<string>} Transaction signature
 */
const transferToken = async (senderWallet, recipientAddress, amount, token) => {
  try {
    const connection = walletUtils.getConnection();
    const recipient = new PublicKey(recipientAddress);
    
    // Get token mint
    const tokenMint = new PublicKey(config.supportedTokens.mints[token]);
    
    // Get sender token account
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderWallet.keypair,
      tokenMint,
      senderWallet.keypair.publicKey
    );
    
    // Get recipient token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderWallet.keypair,
      tokenMint,
      recipient
    );
    
    // Convert amount to token units (most tokens have 6 decimals)
    const tokenAmount = Math.round(amount * 1e6);
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount.address,
      recipientTokenAccount.address,
      senderWallet.keypair.publicKey,
      tokenAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderWallet.keypair]
    );
    
    logger.info(`${token} transfer successful. Signature: ${signature}`);
    return signature;
  } catch (error) {
    logger.error(`${token} transfer failed: ${error.message}`);
    throw error;
  }
};

/**
 * Create a transaction between two users
 * @param {string} senderPhone - Sender phone number
 * @param {string} recipientPhone - Recipient phone number
 * @param {number} amount - Amount to send
 * @param {string} token - Token symbol
 * @returns {Promise<Object>} The created transaction
 */
const createTransaction = async (senderPhone, recipientPhone, amount, token) => {
  try {
    // Find sender
    const sender = await User.findOne({ phoneNumber: senderPhone });
    if (!sender) {
      throw new Error('Sender not found');
    }
    
    // Check if sender has enough balance
    if (sender.tokenBalances[token] < amount) {
      throw new Error(`Insufficient ${token} balance`);
    }
    
    // Find or create recipient
    let recipient = await User.findOne({ phoneNumber: recipientPhone });
    
    if (!recipient) {
      // If recipient doesn't exist, we'll create a placeholder with just the phone number
      // They will need to register to access their funds
      const { encryptedSecretKey, publicKey } = walletUtils.createEncryptedWallet();
      
      recipient = new User({
        phoneNumber: recipientPhone,
        encryptedWalletKey: encryptedSecretKey,
        walletAddress: publicKey,
        pin: '000000', // Temporary PIN, will be updated when they register
        isVerified: false,
      });
      
      await recipient.save();
      logger.info(`Created placeholder user for ${recipientPhone}`);
    }
    
    // Create transaction record
    const transaction = new TransactionModel({
      sender: sender._id,
      recipient: recipient._id,
      senderPhone,
      recipientPhone,
      amount,
      token,
      status: 'pending',
    });
    
    await transaction.save();
    logger.info(`Created transaction: ${transaction._id}`);
    
    return transaction;
  } catch (error) {
    logger.error(`Failed to create transaction: ${error.message}`);
    throw error;
  }
};

/**
 * Execute a transaction on the Solana blockchain
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} The updated transaction
 */
const executeTransaction = async (transactionId) => {
  try {
    // Find transaction
    const transaction = await TransactionModel.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.status !== 'pending') {
      throw new Error(`Transaction is already ${transaction.status}`);
    }
    
    // Find sender and recipient
    const sender = await User.findById(transaction.sender);
    const recipient = await User.findById(transaction.recipient);
    
    if (!sender || !recipient) {
      throw new Error('Sender or recipient not found');
    }
    
    // Decrypt sender wallet
    const senderWallet = walletUtils.decryptWallet(sender.encryptedWalletKey);
    
    // Execute transfer based on token
    let signature;
    if (transaction.token === 'SOL') {
      signature = await transferSol(
        senderWallet,
        recipient.walletAddress,
        transaction.amount
      );
    } else {
      signature = await transferToken(
        senderWallet,
        recipient.walletAddress,
        transaction.amount,
        transaction.token
      );
    }
    
    // Update transaction status
    transaction.status = 'completed';
    transaction.signature = signature;
    transaction.completedAt = Date.now();
    await transaction.save();
    
    // Update balances for both users
    await updateUserBalances(sender._id);
    await updateUserBalances(recipient._id);
    
    logger.info(`Completed transaction ${transactionId}`);
    
    return transaction;
  } catch (error) {
    // Update transaction status to failed
    try {
      const transaction = await TransactionModel.findById(transactionId);
      if (transaction) {
        transaction.status = 'failed';
        transaction.errorMessage = error.message;
        await transaction.save();
      }
    } catch (updateError) {
      logger.error(`Failed to update transaction status: ${updateError.message}`);
    }
    
    logger.error(`Failed to execute transaction ${transactionId}: ${error.message}`);
    throw error;
  }
};

/**
 * Create a pending transaction that needs confirmation
 * @param {string} senderPhone - Sender phone number
 * @param {string} recipientPhone - Recipient phone number
 * @param {number} amount - Amount to send
 * @param {string} token - Token symbol
 * @returns {Promise<Object>} The pending transaction with confirmation code
 */
const createPendingTransaction = async (senderPhone, recipientPhone, amount, token) => {
  try {
    // Generate a random confirmation code
    const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create pending transaction that expires in 5 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    
    const pendingTransaction = new PendingTransaction({
      senderPhone,
      recipientPhone,
      amount,
      token,
      confirmationCode,
      expiresAt,
    });
    
    await pendingTransaction.save();
    logger.info(`Created pending transaction with code ${confirmationCode}`);
    
    return pendingTransaction;
  } catch (error) {
    logger.error(`Failed to create pending transaction: ${error.message}`);
    throw error;
  }
};

/**
 * Confirm and execute a pending transaction
 * @param {string} senderPhone - Sender phone number
 * @param {string} confirmationCode - The confirmation code
 * @returns {Promise<Object>} The completed transaction
 */
const confirmTransaction = async (senderPhone, confirmationCode) => {
  try {
    // Find pending transaction
    const pendingTx = await PendingTransaction.findOne({
      senderPhone,
      confirmationCode: confirmationCode.toUpperCase(),
    });
    
    if (!pendingTx) {
      throw new Error('Invalid confirmation code or expired transaction');
    }
    
    // Create and execute the transaction
    const transaction = await createTransaction(
      pendingTx.senderPhone,
      pendingTx.recipientPhone,
      pendingTx.amount,
      pendingTx.token
    );
    
    const completedTransaction = await executeTransaction(transaction._id);
    
    // Remove the pending transaction
    await pendingTx.remove();
    
    return completedTransaction;
  } catch (error) {
    logger.error(`Failed to confirm transaction: ${error.message}`);
    throw error;
  }
};

module.exports = {
  updateUserBalances,
  transferSol,
  transferToken,
  createTransaction,
  executeTransaction,
  createPendingTransaction,
  confirmTransaction,
}; 