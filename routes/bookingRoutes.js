const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

const {
    getAllBookings,
    getMyBookings,
    getProviderBookings,
    createBooking,
    updateBookingStatus,
    cancelBooking
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

router.patch(
    '/:id/cancel',
    authenticateToken,
    authorizeRoles('customer', 'admin'),
    cancelBooking
);

module.exports = router;