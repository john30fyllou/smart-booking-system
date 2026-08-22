const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

const {
    getAllServices,
    createService,
    updateService,
    deleteService
} = require('../controllers/serviceController');

router.get('/', getAllServices);

router.post(
    '/',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    createService
);

router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    updateService
);

router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    deleteService
);

module.exports = router;