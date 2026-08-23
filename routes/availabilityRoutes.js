const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

const {
    getAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability
} = require('../controllers/availabilityController');

router.get('/', getAvailability);

router.post('/', authenticateToken, authorizeRoles('provider', 'admin'), createAvailability);

router.put('/:id', authenticateToken, authorizeRoles('provider', 'admin'), updateAvailability);

router.delete('/:id', authenticateToken, authorizeRoles('provider', 'admin'), deleteAvailability);

module.exports = router;
