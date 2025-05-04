const express = require('express');
const router = express.Router();
const apiRoutes = require('./apiRoutes');
const smsRoutes = require('./smsRoutes');

// API routes
router.use('/api', apiRoutes);

// SMS webhook routes
router.use('/sms', smsRoutes);

// Root route
router.get('/', (req, res) => {
  res.json({
    name: 'Paytos API',
    description: 'Send and receive Solana tokens via SMS',
    version: '1.0.0',
  });
});

module.exports = router; 