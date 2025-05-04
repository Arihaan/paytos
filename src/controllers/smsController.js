const smsParser = require('../utils/smsParser');
const userService = require('../services/userService');
const transactionService = require('../services/transactionService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

/**
 * Handle incoming SMS messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleIncomingSms = async (req, res) => {
  try {
    const { Body: messageText, From: phoneNumber } = req.body;
    
    logger.info(`Received SMS from ${phoneNumber}: ${messageText}`);
    
    // Parse the SMS command
    const parsedCommand = smsParser.parseSmsCommand(messageText);
    
    // Handle errors in command parsing
    if (parsedCommand.error) {
      await smsService.sendErrorMessage(phoneNumber, parsedCommand.error);
      
      // Send a response to Twilio (empty TwiML to avoid default Twilio response)
      res.set('Content-Type', 'text/xml');
      res.send('<Response></Response>');
      return;
    }
    
    // Handle each command type
    switch (parsedCommand.command) {
      case 'REGISTER':
        await handleRegisterCommand(phoneNumber, parsedCommand.pin);
        break;
        
      case 'BALANCE':
        await handleBalanceCommand(phoneNumber, parsedCommand.pin);
        break;
        
      case 'SEND':
        await handleSendCommand(
          phoneNumber,
          parsedCommand.recipient,
          parsedCommand.amount,
          parsedCommand.token,
          parsedCommand.pin
        );
        break;
        
      case 'CONFIRM':
        await handleConfirmCommand(phoneNumber, parsedCommand.confirmationCode, parsedCommand.pin);
        break;
        
      case 'HELP':
        await handleHelpCommand(phoneNumber);
        break;
        
      case 'YES':
        await handleYesCommand(phoneNumber);
        break;
        
      default:
        await smsService.sendErrorMessage(
          phoneNumber,
          'Unrecognized command. Text HELP for available commands.'
        );
    }
    
    // Send a response to Twilio (empty TwiML)
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (error) {
    logger.error(`Error handling SMS: ${error.message}`);
    res.status(500).send({
      error: 'Failed to process SMS message',
    });
  }
};

/**
 * Handle REGISTER command
 * @param {string} phoneNumber - User phone number
 * @param {string} pin - User PIN
 */
const handleRegisterCommand = async (phoneNumber, pin) => {
  try {
    await userService.registerUser(phoneNumber, pin);
    await smsService.sendRegistrationConfirmation(phoneNumber);
  } catch (error) {
    await smsService.sendErrorMessage(phoneNumber, error.message);
  }
};

/**
 * Handle BALANCE command
 * @param {string} phoneNumber - User phone number
 * @param {string} pin - User PIN
 */
const handleBalanceCommand = async (phoneNumber, pin) => {
  try {
    // Verify PIN
    const isPinValid = await userService.verifyUserPin(phoneNumber, pin);
    
    if (!isPinValid) {
      await smsService.sendErrorMessage(phoneNumber, 'Invalid PIN');
      return;
    }
    
    // Get user balances
    const balances = await userService.getUserBalances(phoneNumber);
    
    // Send balance information via SMS
    await smsService.sendBalanceInfo(phoneNumber, balances);
  } catch (error) {
    await smsService.sendErrorMessage(phoneNumber, error.message);
  }
};

/**
 * Handle SEND command
 * @param {string} senderPhone - Sender phone number
 * @param {string} recipientPhone - Recipient phone number
 * @param {number} amount - Amount to send
 * @param {string} token - Token symbol
 * @param {string} pin - User PIN
 */
const handleSendCommand = async (senderPhone, recipientPhone, amount, token, pin) => {
  try {
    // Verify PIN
    const isPinValid = await userService.verifyUserPin(senderPhone, pin);
    
    if (!isPinValid) {
      await smsService.sendErrorMessage(senderPhone, 'Invalid PIN');
      return;
    }
    
    // Create a pending transaction
    const pendingTx = await transactionService.createPendingTransaction(
      senderPhone,
      recipientPhone,
      amount,
      token
    );
    
    // Send confirmation request
    await smsService.sendTransactionConfirmationRequest(
      senderPhone,
      recipientPhone,
      amount,
      token
    );
  } catch (error) {
    await smsService.sendErrorMessage(senderPhone, error.message);
  }
};

/**
 * Handle CONFIRM command
 * @param {string} phoneNumber - User phone number
 * @param {string} confirmationCode - Confirmation code
 * @param {string} pin - User PIN
 */
const handleConfirmCommand = async (phoneNumber, confirmationCode, pin) => {
  try {
    // Verify PIN
    const isPinValid = await userService.verifyUserPin(phoneNumber, pin);
    
    if (!isPinValid) {
      await smsService.sendErrorMessage(phoneNumber, 'Invalid PIN');
      return;
    }
    
    // Confirm and execute the transaction
    const transaction = await transactionService.confirmTransaction(
      phoneNumber,
      confirmationCode
    );
    
    // Send completion notification
    await smsService.sendTransactionCompletion(
      phoneNumber,
      transaction.recipientPhone,
      transaction.amount,
      transaction.token,
      (await userService.getUserBalances(phoneNumber))[transaction.token]
    );
    
    // Send receipt to recipient
    try {
      const recipient = await userService.getUserByPhone(transaction.recipientPhone);
      
      if (recipient && recipient.isVerified) {
        await smsService.sendTransactionReceipt(
          transaction.recipientPhone,
          transaction.senderPhone,
          transaction.amount,
          transaction.token,
          recipient.tokenBalances[transaction.token]
        );
      }
    } catch (error) {
      logger.error(`Failed to send receipt: ${error.message}`);
      // Continue even if sending receipt fails
    }
  } catch (error) {
    await smsService.sendErrorMessage(phoneNumber, error.message);
  }
};

/**
 * Handle HELP command
 * @param {string} phoneNumber - User phone number
 */
const handleHelpCommand = async (phoneNumber) => {
  try {
    await smsService.sendHelpMessage(phoneNumber);
  } catch (error) {
    await smsService.sendErrorMessage(phoneNumber, error.message);
  }
};

/**
 * Handle YES command (for confirming transactions)
 * @param {string} phoneNumber - User phone number
 */
const handleYesCommand = async (phoneNumber) => {
  try {
    // Find the most recent pending transaction for this phone number
    const PendingTransaction = require('../models/PendingTransaction');
    const pendingTx = await PendingTransaction.findOne({ 
      senderPhone: phoneNumber 
    }).sort({ createdAt: -1 });
    
    if (!pendingTx) {
      await smsService.sendErrorMessage(
        phoneNumber,
        'No pending transaction to confirm.'
      );
      return;
    }
    
    // Create and execute the transaction
    const transaction = await transactionService.createTransaction(
      pendingTx.senderPhone,
      pendingTx.recipientPhone,
      pendingTx.amount,
      pendingTx.token
    );
    
    const completedTransaction = await transactionService.executeTransaction(transaction._id);
    
    // Remove the pending transaction
    await pendingTx.remove();
    
    // Send completion notification
    await smsService.sendTransactionCompletion(
      phoneNumber,
      completedTransaction.recipientPhone,
      completedTransaction.amount,
      completedTransaction.token,
      (await userService.getUserBalances(phoneNumber))[completedTransaction.token]
    );
    
    // Send receipt to recipient
    try {
      const recipient = await userService.getUserByPhone(completedTransaction.recipientPhone);
      
      if (recipient && recipient.isVerified) {
        await smsService.sendTransactionReceipt(
          completedTransaction.recipientPhone,
          completedTransaction.senderPhone,
          completedTransaction.amount,
          completedTransaction.token,
          recipient.tokenBalances[completedTransaction.token]
        );
      }
    } catch (error) {
      logger.error(`Failed to send receipt: ${error.message}`);
      // Continue even if sending receipt fails
    }
  } catch (error) {
    await smsService.sendErrorMessage(phoneNumber, error.message);
  }
};

module.exports = {
  handleIncomingSms,
}; 