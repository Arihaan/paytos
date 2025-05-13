import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import config from '../../config/config';
import encryption from './encryption';

// Define interfaces for return types
interface Wallet {
    keypair: Keypair;
    publicKey: string;
    secretKey: string;
}

interface EncryptedWallet {
    encryptedSecretKey: string;
    publicKey: string;
}

// Initialize Solana connection
const getConnection = (): Connection => {
    return new Connection(config.solana.rpcUrl);
};

/**
 * Create a new Solana wallet
 * @returns {Wallet} Object containing wallet keypair and public address
 */
const createWallet = (): Wallet => {
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
 * @returns {Wallet} Object containing wallet keypair and public address
 */
const restoreWallet = (secretKey: string): Wallet => {
    const decodedKey = bs58.decode(secretKey);
    const keypair = Keypair.fromSecretKey(new Uint8Array(decodedKey));
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
 * @returns {Promise<any>} The token account
 */
const getTokenAccount = async (walletAddress: string, tokenMint: string): Promise<any> => {
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
 * @returns {Promise<number>} The token balance
 */
const checkTokenBalance = async (walletAddress: string, token: string): Promise<number> => {
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
 * @returns {Wallet} The master wallet
 */
const getMasterWallet = (): Wallet => {
    if (!config.solana.masterWalletSecret) {
        throw new Error('Master wallet secret key is not set');
    }
    
    return restoreWallet(config.solana.masterWalletSecret);
};

/**
 * Create an encrypted wallet for a user
 * @returns {EncryptedWallet} Object containing encrypted secret key and public address
 */
const createEncryptedWallet = (): EncryptedWallet => {
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
 * @returns {Wallet} The wallet
 */
const decryptWallet = (encryptedSecretKey: string): Wallet => {
    const secretKey = encryption.decrypt(encryptedSecretKey);
    return restoreWallet(secretKey);
};

export {
    createWallet,
    restoreWallet,
    getTokenAccount,
    checkTokenBalance,
    getMasterWallet,
    createEncryptedWallet,
    decryptWallet,
    getConnection,
    Wallet,
    EncryptedWallet
};