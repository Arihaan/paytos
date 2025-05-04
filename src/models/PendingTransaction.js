const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PendingTransactionSchema = new Schema({
  senderPhone: {
    type: String,
    required: true,
  },
  recipientPhone: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  token: {
    type: String,
    enum: ['USDC', 'USDT', 'PYUSD', 'SOL'],
    required: true,
  },
  confirmationCode: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Automatically delete pending transactions after they expire
PendingTransactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PendingTransaction', PendingTransactionSchema); 