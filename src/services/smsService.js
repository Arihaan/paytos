const twilio = require('twilio');
const config = require('../../config/config');
const logger = require('../utils/logger');

// Initialize Twilio client
const getClient = () => {
  if (!config.twilio.accountSid || !config.twilio.authToken) {
    throw new Error('Twilio configuration is incomplete');
  }
  return twilio(
    config.twilio.accountSid,
    config.twilio.authToken
  );
};

/**
 * Send an SMS message
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} message - Message content
 * @returns {Promise<Object>} The message SID and status
 */
const sendSms = async (to, message) => {
  try {
    if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
      throw new Error('Twilio configuration is incomplete');
    }
    
    const client = getClient();
    const result = await client.messages.create({
      body: message,
      from: config.twilio.phoneNumber,
      to,
    });
    
    logger.info(`SMS sent to ${to}. SID: ${result.sid}`);
    return {
      sid: result.sid,
      status: result.status,
    };
  } catch (error) {
    logger.error(`Failed to send SMS to ${to}: ${error.message}`);
    throw error;
  }
};

/**
 * Format and send a registration confirmation message
 * @param {string} phoneNumber - User phone number
 */
const sendRegistrationConfirmation = async (phoneNumber) => {
  const message = 
`Welcome to Paytos! Your wallet has been created.
- To check your balance, text: BALANCE <PIN>
- To send money, text: SEND <RECIPIENT> <AMOUNT> <TOKEN> <PIN>
- For help, text: HELP`;
  
  return sendSms(phoneNumber, message);
};

/**
 * Format and send a balance message
 * @param {string} phoneNumber - User phone number
 * @param {Object} balances - Token balances
 */
const sendBalanceInfo = async (phoneNumber, balances) => {
  const message = 
`Paytos Balance:
SOL: ${balances.SOL.toFixed(4)}
USDC: ${balances.USDC.toFixed(2)}
USDT: ${balances.USDT.toFixed(2)}
PYUSD: ${balances.PYUSD.toFixed(2)}`;
  
  return sendSms(phoneNumber, message);
};

/**
 * Format and send a transaction confirmation request
 * @param {string} phoneNumber - User phone number
 * @param {string} recipient - Recipient phone number
 * @param {number} amount - Transaction amount
 * @param {string} token - Token symbol
 */
const sendTransactionConfirmationRequest = async (phoneNumber, recipient, amount, token) => {
  const message = 
`Confirm sending ${amount} ${token} to ${recipient}?
Reply with YES to confirm or NO to cancel.`;
  
  return sendSms(phoneNumber, message);
};

/**
 * Format and send a transaction completion notification
 * @param {string} phoneNumber - User phone number
 * @param {string} recipient - Recipient phone number
 * @param {number} amount - Transaction amount
 * @param {string} token - Token symbol
 * @param {number} newBalance - New balance after transaction
 */
const sendTransactionCompletion = async (phoneNumber, recipient, amount, token, newBalance) => {
  const message = 
`Sent ${amount} ${token} to ${recipient}.
New ${token} balance: ${newBalance.toFixed(token === 'SOL' ? 4 : 2)}`;
  
  return sendSms(phoneNumber, message);
};

/**
 * Format and send a transaction receipt notification
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} sender - Sender phone number
 * @param {number} amount - Transaction amount
 * @param {string} token - Token symbol
 * @param {number} newBalance - New balance after receiving
 */
const sendTransactionReceipt = async (phoneNumber, sender, amount, token, newBalance) => {
  const message = 
`You received ${amount} ${token} from ${sender}.
New ${token} balance: ${newBalance.toFixed(token === 'SOL' ? 4 : 2)}`;
  
  return sendSms(phoneNumber, message);
};

/**
 * Format and send an error message
 * @param {string} phoneNumber - User phone number 
 * @param {string} errorMessage - Error message
 */
const sendErrorMessage = async (phoneNumber, errorMessage) => {
  const message = `Error: ${errorMessage}`;
  return sendSms(phoneNumber, message);
};

/**
 * Format and send a help message
 * @param {string} phoneNumber - User phone number
 */
const sendHelpMessage = async (phoneNumber) => {
  const message = 
`Paytos Commands:
- REGISTER <PIN> - Create a new wallet
- BALANCE <PIN> - Check your balance
- SEND <RECIPIENT> <AMOUNT> <TOKEN> <PIN> - Send tokens
  Example: SEND +1234567890 10 USDC 1234
- Supported tokens: SOL, USDC, USDT, PYUSD

Need more help? Visit paytos.io`;
  
  return sendSms(phoneNumber, message);
};

module.exports = {
  sendSms,
  sendRegistrationConfirmation,
  sendBalanceInfo,
  sendTransactionConfirmationRequest,
  sendTransactionCompletion,
  sendTransactionReceipt,
  sendErrorMessage,
  sendHelpMessage,
}; 