const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

const {
    analyzeIntent
} = require('../controllers/intentController');

router.post(
    '/',
    authenticateToken,
    authorizeRoles('customer', 'admin'),
    analyzeIntent
);

module.exports = router;