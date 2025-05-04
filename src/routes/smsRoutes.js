const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Twilio webhook for incoming SMS
router.post('/webhook', smsController.handleIncomingSms);

module.exports = router; 