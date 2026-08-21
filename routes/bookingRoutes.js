const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

const {
    getAllBookings,
    getMyBookings,
    getProviderBookings,
    createBooking,
    updateBookingStatus
} = require('../controllers/bookingController');

router.get('/', getAllBookings);

router.get(
    '/my',
    authenticateToken,
    authorizeRoles('customer', 'admin'),
    getMyBookings
);

router.get(
    '/provider',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    getProviderBookings
);

router.post(
    '/',
    authenticateToken,
    authorizeRoles('customer', 'admin'),
    createBooking
);

router.patch(
    '/:id/status',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    updateBookingStatus
);

module.exports = router;