const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  signature: {
    type: String,
    default: null,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('Transaction', TransactionSchema); 