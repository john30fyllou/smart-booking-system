const express = require('express');

const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const {
    getAvailability,
    createAvailability
} = require('../controllers/availabilityController');

router.get('/', getAvailability);

router.post(
    '/',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    createAvailability
);
module.exports = router;