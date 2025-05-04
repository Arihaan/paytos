/**
 * Parse REGISTER command
 * Format: REGISTER <PIN>
 * @param {string} text - The SMS text
 * @returns {Object|null} Parsed command or null if invalid
 */
const parseRegister = (text) => {
  const parts = text.trim().split(/\s+/);
  
  if (parts.length !== 2 || parts[0].toUpperCase() !== 'REGISTER') {
    return null;
  }
  
  const pin = parts[1];
  
  // PIN should be 4-6 digits
  if (!/^\d{4,6}$/.test(pin)) {
    return {
      command: 'REGISTER',
      error: 'Invalid PIN. It should be 4-6 digits.',
    };
  }
  
  return {
    command: 'REGISTER',
    pin,
  };
};

/**
 * Parse BALANCE command
 * Format: BALANCE <PIN>
 * @param {string} text - The SMS text
 * @returns {Object|null} Parsed command or null if invalid
 */
const parseBalance = (text) => {
  const parts = text.trim().split(/\s+/);
  
  if (parts.length !== 2 || parts[0].toUpperCase() !== 'BALANCE') {
    return null;
  }
  
  const pin = parts[1];
  
  // PIN should be 4-6 digits
  if (!/^\d{4,6}$/.test(pin)) {
    return {
      command: 'BALANCE',
      error: 'Invalid PIN. It should be 4-6 digits.',
    };
  }
  
  return {
    command: 'BALANCE',
    pin,
  };
};

/**
 * Parse SEND command
 * Format: SEND <RECIPIENT> <AMOUNT> <TOKEN> <PIN>
 * @param {string} text - The SMS text
 * @returns {Object|null} Parsed command or null if invalid
 */
const parseSend = (text) => {
  const parts = text.trim().split(/\s+/);
  
  if (parts.length !== 5 || parts[0].toUpperCase() !== 'SEND') {
    return null;
  }
  
  const [_, recipient, amountStr, token, pin] = parts;
  const amount = parseFloat(amountStr);
  
  // Recipient should be a phone number with country code (e.g., +1234567890)
  if (!/^\+\d{7,15}$/.test(recipient)) {
    return {
      command: 'SEND',
      error: 'Invalid recipient phone number. It should include the country code (e.g., +1234567890).',
    };
  }
  
  // Amount should be a valid number greater than 0
  if (isNaN(amount) || amount <= 0) {
    return {
      command: 'SEND',
      error: 'Invalid amount. It should be a number greater than 0.',
    };
  }
  
  // Token should be one of the supported tokens
  const supportedTokens = ['USDC', 'USDT', 'PYUSD', 'SOL'];
  const normalizedToken = token.toUpperCase();
  if (!supportedTokens.includes(normalizedToken)) {
    return {
      command: 'SEND',
      error: `Invalid token. Supported tokens are: ${supportedTokens.join(', ')}.`,
    };
  }
  
  // PIN should be 4-6 digits
  if (!/^\d{4,6}$/.test(pin)) {
    return {
      command: 'SEND',
      error: 'Invalid PIN. It should be 4-6 digits.',
    };
  }
  
  return {
    command: 'SEND',
    recipient,
    amount,
    token: normalizedToken,
    pin,
  };
};

/**
 * Parse CONFIRM command
 * Format: CONFIRM <CONFIRMATION_CODE> <PIN>
 * @param {string} text - The SMS text
 * @returns {Object|null} Parsed command or null if invalid
 */
const parseConfirm = (text) => {
  const parts = text.trim().split(/\s+/);
  
  if (parts.length !== 3 || parts[0].toUpperCase() !== 'CONFIRM') {
    return null;
  }
  
  const [_, confirmationCode, pin] = parts;
  
  // Confirmation code should be alphanumeric
  if (!/^[a-zA-Z0-9]{4,8}$/.test(confirmationCode)) {
    return {
      command: 'CONFIRM',
      error: 'Invalid confirmation code.',
    };
  }
  
  // PIN should be 4-6 digits
  if (!/^\d{4,6}$/.test(pin)) {
    return {
      command: 'CONFIRM',
      error: 'Invalid PIN. It should be 4-6 digits.',
    };
  }
  
  return {
    command: 'CONFIRM',
    confirmationCode,
    pin,
  };
};

/**
 * Parse HELP command
 * Format: HELP
 * @param {string} text - The SMS text
 * @returns {Object|null} Parsed command or null if invalid
 */
const parseHelp = (text) => {
  const trimmed = text.trim().toUpperCase();
  
  if (trimmed === 'HELP') {
    return {
      command: 'HELP',
    };
  }
  
  return null;
};

/**
 * Parse YES command (for confirming transactions)
 * Format: YES
 * @param {string} text - The SMS text
 * @returns {Object|null} Parsed command or null if invalid
 */
const parseYes = (text) => {
  const trimmed = text.trim().toUpperCase();
  
  if (trimmed === 'YES') {
    return {
      command: 'YES',
    };
  }
  
  return null;
};

/**
 * Parse SMS text and identify the command
 * @param {string} text - The SMS text
 * @returns {Object} Parsed command
 */
const parseSmsCommand = (text) => {
  if (!text) {
    return {
      error: 'Empty message.',
    };
  }
  
  // Try to parse each command type
  const parsers = [
    parseRegister,
    parseBalance,
    parseSend,
    parseConfirm,
    parseHelp,
    parseYes,
  ];
  
  for (const parser of parsers) {
    const result = parser(text);
    if (result) {
      return result;
    }
  }
  
  // If no parser matched, return an error
  return {
    error: 'Invalid command format. Text HELP for available commands.',
  };
};

module.exports = {
  parseSmsCommand,
}; 