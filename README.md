# Paytos: Pay Tokens Over SMS

Paytos allows users to send and receive Solana tokens (SOL, USDC, USDT, PYUSD) via basic SMS on feature phones with no internet access.

## 🔧 Core Idea

Paytos bridges the gap between blockchain and traditional feature phones by enabling:

- A backend wallet system that users interact with via SMS commands
- A trusted SMS gateway (Twilio) to send/receive messages
- Custodial wallets managed by our backend on Solana

## 📱 How It Works

### User Registration
```
User sends: REGISTER <PIN>
Response: "Wallet created. Balance: $0 USD. Your PIN is used to confirm transactions."
```

### Checking Balance
```
User sends: BALANCE <PIN>
Response: "Paytos Balance: SOL: 0.0000, USDC: 0.00, USDT: 0.00, PYUSD: 0.00"
```

### Sending Money
```
User sends: SEND +448927779812 10 USDC <PIN>
Response: "Confirm sending 10 USDC to +448927779812? Reply with YES to confirm or NO to cancel."
User sends: YES
Response: "Sent 10 USDC to +448927779812. New USDC balance: 5.00"
```

### Receiving Money
The recipient gets a notification when money is sent to their phone number:
```
"You received 10 USDC from +123456789. New USDC balance: 10.00"
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- Twilio account
- Solana wallet with funds (for development, use devnet)

### Installation

1. Clone the repository
```
git clone https://github.com/username/paytos.git
cd paytos
```

2. Install dependencies
```
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/paytos

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_MASTER_WALLET_SECRET=your_master_wallet_secret_key

# Encryption Key for storing user wallet keys
ENCRYPTION_KEY=your_strong_encryption_key_32_chars

# Token Mint Addresses (Solana Devnet)
USDC_MINT=your_usdc_mint_address
USDT_MINT=your_usdt_mint_address
PYUSD_MINT=your_pyusd_mint_address
```
# JWT Configuration
JWT_SECRET=your_jwt_secret_key_for_admin_api

# Admin API Security
ADMIN_API_KEY=your_secure_admin_api_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # Maximum requests per window
```

4. Start the server

```bash
# Build JS from TypeScript
npx tsc

# Start the application
npm run dev
```

5. Set up Twilio webhook
Configure your Twilio phone number to send webhook POST requests to:
```
https://your-server.com/sms/webhook
```

## 💬 SMS Commands

- `REGISTER <PIN>` - Create a new wallet
- `BALANCE <PIN>` - Check your balance
- `SEND <RECIPIENT> <AMOUNT> <TOKEN> <PIN>` - Send tokens
  - Example: `SEND +1234567890 10 USDC 1234`
- `HELP` - Get list of available commands

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Blockchain**: Solana, SPL Token
- **SMS Gateway**: Twilio
- **Security**: AES encryption for wallet keys

#build# 🔒 Security Notes

- User wallet private keys are encrypted at rest
- PINs are hashed before storage
- Account locking after 5 failed PIN attempts
- Transaction confirmations required before execution

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details. 