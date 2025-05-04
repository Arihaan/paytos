const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');
const config = require('../../config/config');
const encryption = require('./encryption');

// Initialize Solana connection
const getConnection = () => {
  return new Connection(config.solana.rpcUrl);
};

/**
 * Create a new Solana wallet
 * @returns {Object} Object containing wallet keypair and public address
 */
const createWallet = () => {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toString();
  const secretKey = bs58.encode(keypair.secretKey);
  
  return {
    keypair,
    publicKey,
    secretKey,
  };
};

/**
 * Restore a Solana wallet from a secret key
 * @param {string} secretKey - The base58 encoded secret key
 * @returns {Object} Object containing wallet keypair and public address
 */
const restoreWallet = (secretKey) => {
  const decodedKey = bs58.decode(secretKey);
  const keypair = Keypair.fromSecretKey(decodedKey);
  const publicKey = keypair.publicKey.toString();
  
  return {
    keypair,
    publicKey,
    secretKey,
  };
};

/**
 * Get token account for a wallet
 * @param {string} walletAddress - Public key of the wallet
 * @param {string} tokenMint - Public key of the token mint
 * @returns {Object} The token account
 */
const getTokenAccount = async (walletAddress, tokenMint) => {
  const connection = getConnection();
  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(tokenMint);
  
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    getMasterWallet().keypair, // Payer for transaction
    mint,
    wallet
  );
  
  return tokenAccount;
};

/**
 * Check the balance of a specific token in a wallet
 * @param {string} walletAddress - Public key of the wallet
 * @param {string} token - Token symbol (e.g., 'USDC')
 * @returns {number} The token balance
 */
const checkTokenBalance = async (walletAddress, token) => {
  // For SOL token, check native balance
  if (token === 'SOL') {
    const connection = getConnection();
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    return balance / 1e9; // Convert lamports to SOL
  }
  
  // For other tokens, check token account
  const tokenMint = config.supportedTokens.mints[token];
  if (!tokenMint) {
    throw new Error(`Unsupported token: ${token}`);
  }
  
  try {
    const tokenAccount = await getTokenAccount(walletAddress, tokenMint);
    return tokenAccount.amount / 1e6; // Most stablecoins have 6 decimals
  } catch (error) {
    console.error(`Error checking ${token} balance:`, error);
    return 0;
  }
};

/**
 * Get the master wallet (used for paying fees)
 * @returns {Object} The master wallet
 */
const getMasterWallet = () => {
  if (!config.solana.masterWalletSecret) {
    throw new Error('Master wallet secret key is not set');
  }
  
  return restoreWallet(config.solana.masterWalletSecret);
};

/**
 * Create an encrypted wallet for a user
 * @returns {Object} Object containing encrypted secret key and public address
 */
const createEncryptedWallet = () => {
  const { secretKey, publicKey } = createWallet();
  const encryptedSecretKey = encryption.encrypt(secretKey);
  
  return {
    encryptedSecretKey,
    publicKey,
  };
};

/**
 * Decrypt a user's wallet
 * @param {string} encryptedSecretKey - The encrypted secret key
 * @returns {Object} The wallet
 */
const decryptWallet = (encryptedSecretKey) => {
  const secretKey = encryption.decrypt(encryptedSecretKey);
  return restoreWallet(secretKey);
};

module.exports = {
  createWallet,
  restoreWallet,
  getTokenAccount,
  checkTokenBalance,
  getMasterWallet,
  createEncryptedWallet,
  decryptWallet,
  getConnection,
}; 