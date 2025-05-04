require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/paytos',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    masterWalletSecret: process.env.SOLANA_MASTER_WALLET_SECRET,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  supportedTokens: {
    list: (process.env.SUPPORTED_TOKENS || 'USDC,USDT,PYUSD,SOL').split(','),
    mints: {
      USDC: process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      USDT: process.env.USDT_MINT || 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      PYUSD: process.env.PYUSD_MINT || '9idXDPGb5jfwaf5fxjiDHjcugpYVrJHiM4rR8G9yqXW7',
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_default_jwt_secret_for_development',
  },
}; 