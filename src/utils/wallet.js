"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = exports.decryptWallet = exports.createEncryptedWallet = exports.getMasterWallet = exports.checkTokenBalance = exports.getTokenAccount = exports.restoreWallet = exports.createWallet = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const bs58_1 = __importDefault(require("bs58"));
const config_1 = __importDefault(require("../../config/config"));
const encryption_1 = __importDefault(require("./encryption"));
// Initialize Solana connection
const getConnection = () => {
    return new web3_js_1.Connection(config_1.default.solana.rpcUrl);
};
exports.getConnection = getConnection;
/**
 * Create a new Solana wallet
 * @returns {Wallet} Object containing wallet keypair and public address
 */
const createWallet = () => {
    const keypair = web3_js_1.Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKey = bs58_1.default.encode(keypair.secretKey);
    return {
        keypair,
        publicKey,
        secretKey,
    };
};
exports.createWallet = createWallet;
/**
 * Restore a Solana wallet from a secret key
 * @param {string} secretKey - The base58 encoded secret key
 * @returns {Wallet} Object containing wallet keypair and public address
 */
const restoreWallet = (secretKey) => {
    const decodedKey = bs58_1.default.decode(secretKey);
    const keypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(decodedKey));
    const publicKey = keypair.publicKey.toString();
    return {
        keypair,
        publicKey,
        secretKey,
    };
};
exports.restoreWallet = restoreWallet;
/**
 * Get token account for a wallet
 * @param {string} walletAddress - Public key of the wallet
 * @param {string} tokenMint - Public key of the token mint
 * @returns {Promise<any>} The token account
 */
const getTokenAccount = (walletAddress, tokenMint) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = getConnection();
    const wallet = new web3_js_1.PublicKey(walletAddress);
    const mint = new web3_js_1.PublicKey(tokenMint);
    try {
        // Import the function
        const { getAssociatedTokenAddress } = require('@solana/spl-token');
        const { AccountLayout } = require('@solana/spl-token');
        // Find the associated token account address
        const associatedTokenAddress = yield getAssociatedTokenAddress(mint, wallet);
        // Check if the account exists
        const tokenAccount = yield connection.getAccountInfo(associatedTokenAddress);
        if (tokenAccount) {
            // Deserialize the token account data to get amount
            const accountData = AccountLayout.decode(tokenAccount.data);
            return {
                address: associatedTokenAddress,
                amount: accountData.amount
            };
        }
        else {
            console.log('Token account does not exist, creating it...');
            // If it doesn't exist, create it
            return yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, getMasterWallet().keypair, // Payer for transaction
            mint, wallet);
        }
    }
    catch (error) {
        console.error('Error getting token account:', error);
        throw error;
    }
});
exports.getTokenAccount = getTokenAccount;
/**
 * Check the balance of a specific token in a wallet
 * @param {string} walletAddress - Public key of the wallet
 * @param {string} token - Token symbol (e.g., 'USDC')
 * @returns {Promise<number>} The token balance
 */
const checkTokenBalance = (walletAddress, token) => __awaiter(void 0, void 0, void 0, function* () {
    // For SOL token, check native balance
    if (token === 'SOL') {
        const connection = getConnection();
        const balance = yield connection.getBalance(new web3_js_1.PublicKey(walletAddress));
        return balance / 1e9; // Convert lamports to SOL
    }
    // For other tokens, check token account
    const tokenMint = config_1.default.supportedTokens.mints[token];
    console.log('Token mint:', tokenMint);
    if (!tokenMint) {
        throw new Error(`Unsupported token: ${token}`);
    }
    try {
        const tokenAccount = yield getTokenAccount(walletAddress, tokenMint);
        console.log('Raw token account data:', tokenAccount);
        console.log('Token account:', tokenAccount.amount);
        // Convert BigInt to number before division
        const amountNumber = Number(tokenAccount.amount);
        console.log('Token account:', amountNumber / 1e6);
        return amountNumber / 1e6; // Most stablecoins have 6 decimals
    }
    catch (error) {
        console.error(`Error checking ${token} balance:`, error);
        return 0;
    }
});
exports.checkTokenBalance = checkTokenBalance;
/**
 * Get the master wallet (used for paying fees)
 * @returns {Wallet} The master wallet
 */
const getMasterWallet = () => {
    if (!config_1.default.solana.masterWalletSecret) {
        throw new Error('Master wallet secret key is not set');
    }
    return restoreWallet(config_1.default.solana.masterWalletSecret);
};
exports.getMasterWallet = getMasterWallet;
/**
 * Create an encrypted wallet for a user
 * @returns {EncryptedWallet} Object containing encrypted secret key and public address
 */
const createEncryptedWallet = () => {
    const { secretKey, publicKey } = createWallet();
    const encryptedSecretKey = encryption_1.default.encrypt(secretKey);
    return {
        encryptedSecretKey,
        publicKey,
    };
};
exports.createEncryptedWallet = createEncryptedWallet;
/**
 * Decrypt a user's wallet
 * @param {string} encryptedSecretKey - The encrypted secret key
 * @returns {Wallet} The wallet
 */
const decryptWallet = (encryptedSecretKey) => {
    const secretKey = encryption_1.default.decrypt(encryptedSecretKey);
    return restoreWallet(secretKey);
};
exports.decryptWallet = decryptWallet;
