const express = require('express');
const router = express.Router();
const greetingController = require('../controllers/greetingController');

router.get('/greeting', greetingController.getGreeting);

module.exports = router;

