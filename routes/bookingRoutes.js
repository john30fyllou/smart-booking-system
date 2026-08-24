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
    cancelBooking,
    getAvailableSlots,
    rescheduleBooking
} = require('../controllers/bookingController');

router.get(
    '/available-slots',
    authenticateToken,
    authorizeRoles('customer', 'admin'),
    getAvailableSlots
);

router.get('/', authenticateToken, authorizeRoles('admin'), getAllBookings);

router.get('/my', authenticateToken, authorizeRoles('customer', 'admin'), getMyBookings);

router.get(
    '/provider',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    getProviderBookings
);

router.post('/', authenticateToken, authorizeRoles('customer', 'admin'), createBooking);

router.patch(
    '/:id/status',
    authenticateToken,
    authorizeRoles('provider', 'admin'),
    updateBookingStatus
);

router.patch('/:id/cancel', authenticateToken, authorizeRoles('customer', 'admin'), cancelBooking);

router.patch(
    '/:id/reschedule',
    authenticateToken,
    authorizeRoles('customer', 'admin'),
    rescheduleBooking
);
module.exports = router;
