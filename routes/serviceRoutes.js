const express = require('express');

const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const {
    getAllServices,
    createService
} = require('../controllers/serviceController');

router.get('/', getAllServices);

router.post(
    '/',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    createService
);

module.exports = router;