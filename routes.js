const express = require('express');
const router = express.Router();
const botController = require('./controllers/botController');

// Middleware for logging request details
router.use((req, res, next) => {
    console.log(`Incoming request on ${req.path} with method ${req.method}`);
    next();
});

// Route-specific middleware for validating request body
const validateStartBot = (req, res, next) => {
    if (!req.body.From || !req.body.Body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    next();
};

router.post('/BotConnector/StartBot', validateStartBot, botController.startBot);
router.post('/BotConnector/SendMessage', validateStartBot, botController.sendMessage);

// General error handling middleware
router.use((err, req, res, next) => {
    console.error('Unexpected error:', err);
    res.status(500).send('An unexpected error occurred');
});

module.exports = router;
