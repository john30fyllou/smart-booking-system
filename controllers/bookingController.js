const db = require('../db');

const getAllBookings = (req, res) => {
    const sql = `
        SELECT
            bookings.id,
            bookings.booking_date,
            bookings.start_time,
            bookings.end_time,
            bookings.status,
            services.name AS service_name,
            customers.first_name AS customer_first_name,
            customers.last_name AS customer_last_name,
            providers.first_name AS provider_first_name,
            providers.last_name AS provider_last_name
        FROM bookings
        JOIN services ON bookings.service_id = services.id
        JOIN users AS customers ON bookings.customer_id = customers.id
        JOIN users AS providers ON services.provider_id = providers.id
        ORDER BY bookings.booking_date, bookings.start_time
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        res.status(200).json(results);
    });
};

const getMyBookings = (req, res) => {
    const customerId = req.user.id;

    const sql = `
        SELECT
            bookings.id,
            bookings.booking_date,
            bookings.start_time,
            bookings.end_time,
            bookings.status,
            services.name AS service_name,
            providers.first_name AS provider_first_name,
            providers.last_name AS provider_last_name
        FROM bookings
        JOIN services ON bookings.service_id = services.id
        JOIN users AS providers ON services.provider_id = providers.id
        WHERE bookings.customer_id = ?
        ORDER BY bookings.booking_date, bookings.start_time
    `;

    db.query(sql, [customerId], (err, results) => {
        if (err) {
            console.error('Error fetching user bookings:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        res.status(200).json(results);
    });
};

const getProviderBookings = (req, res) => {
    const providerId = req.user.id;

    const sql = `
        SELECT
            bookings.id,
            bookings.booking_date,
            bookings.start_time,
            bookings.end_time,
            bookings.status,
            services.name AS service_name,
            customers.first_name AS customer_first_name,
            customers.last_name AS customer_last_name
        FROM bookings
        JOIN services ON bookings.service_id = services.id
        JOIN users AS customers ON bookings.customer_id = customers.id
        WHERE services.provider_id = ?
        ORDER BY bookings.booking_date, bookings.start_time
    `;

    db.query(sql, [providerId], (err, results) => {
        if (err) {
            console.error('Error fetching provider bookings:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        res.status(200).json(results);
    });
};

const createBooking = (req, res) => {
    const customerId = req.user.id;

    const {
        service_id,
        booking_date,
        start_time
    } = req.body;

    if (!service_id || !booking_date || !start_time) {
        return res.status(400).json({
            message: 'Service, date and start time are required'
        });
    }

    const serviceSql = `
        SELECT
            id,
            provider_id,
            duration_minutes
        FROM services
        WHERE id = ?
    `;

    db.query(serviceSql, [service_id], (err, services) => {
        if (err) {
            console.error('Error fetching service:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (services.length === 0) {
            return res.status(404).json({
                message: 'Service not found'
            });
        }

        const service = services[0];

        const calculateEndTime = (startTime, durationMinutes) => {
            const [hours, minutes, seconds] = startTime
                .split(':')
                .map(Number);

            const startDate = new Date();

            startDate.setHours(
                hours,
                minutes,
                seconds || 0,
                0
            );

            startDate.setMinutes(
                startDate.getMinutes() + durationMinutes
            );

            return startDate
                .toTimeString()
                .slice(0, 8);
        };

        const endTime = calculateEndTime(
            start_time,
            service.duration_minutes
        );

        const availabilitySql = `
            SELECT id
            FROM availability
            WHERE provider_id = ?
              AND available_date = ?
              AND start_time <= ?
              AND end_time >= ?
        `;

        db.query(
            availabilitySql,
            [
                service.provider_id,
                booking_date,
                start_time,
                endTime
            ],
            (err, availabilityResults) => {
                if (err) {
                    console.error(
                        'Error checking availability:',
                        err
                    );

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                if (availabilityResults.length === 0) {
                    return res.status(400).json({
                        message:
                            'Provider is not available at the selected time'
                    });
                }

                const conflictSql = `
                    SELECT bookings.id
                    FROM bookings
                    JOIN services
                        ON bookings.service_id = services.id
                    WHERE services.provider_id = ?
                      AND bookings.booking_date = ?
                      AND bookings.status
                          IN ('pending', 'approved')
                      AND bookings.start_time < ?
                      AND bookings.end_time > ?
                `;

                db.query(
                    conflictSql,
                    [
                        service.provider_id,
                        booking_date,
                        endTime,
                        start_time
                    ],
                    (err, conflictResults) => {
                        if (err) {
                            console.error(
                                'Error checking booking conflicts:',
                                err
                            );

                            return res.status(500).json({
                                message: 'Database error'
                            });
                        }

                        if (conflictResults.length > 0) {
                            return res.status(409).json({
                                message:
                                    'Selected time conflicts with an existing booking'
                            });
                        }

                        const insertSql = `
                            INSERT INTO bookings
                            (
                                customer_id,
                                service_id,
                                booking_date,
                                start_time,
                                end_time
                            )
                            VALUES (?, ?, ?, ?, ?)
                        `;

                        db.query(
                            insertSql,
                            [
                                customerId,
                                service_id,
                                booking_date,
                                start_time,
                                endTime
                            ],
                            (err, result) => {
                                if (err) {
                                    console.error(
                                        'Error creating booking:',
                                        err
                                    );

                                    return res.status(500).json({
                                        message: 'Database error'
                                    });
                                }

                                res.status(201).json({
                                    message: 'Booking created successfully',
                                    bookingId: result.insertId,
                                    booking: {
                                        serviceId: service_id,
                                        providerId: service.provider_id,
                                        bookingDate: booking_date,
                                        startTime: start_time,
                                        endTime: endTime,
                                        status: 'pending'
                                    }
                                });
                            }
                        );
                    }
                );
            }
        );
    });
};

const updateBookingStatus = (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = [
        'approved',
        'cancelled',
        'completed'
    ];

    if (!status) {
        return res.status(400).json({
            message: 'Status is required'
        });
    }

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: 'Invalid booking status'
        });
    }

    const findBookingSql = `
        SELECT
            bookings.id,
            services.provider_id
        FROM bookings
        JOIN services ON bookings.service_id = services.id
        WHERE bookings.id = ?
    `;

    db.query(findBookingSql, [bookingId], (err, results) => {
        if (err) {
            console.error('Error fetching booking:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: 'Booking not found'
            });
        }

        const booking = results[0];

        if (
            req.user.role === 'provider' &&
            booking.provider_id !== req.user.id
        ) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const updateSql = `
            UPDATE bookings
            SET status = ?
            WHERE id = ?
        `;

        db.query(
            updateSql,
            [status, bookingId],
            (err) => {
                if (err) {
                    console.error(
                        'Error updating booking status:',
                        err
                    );

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                res.status(200).json({
                    message: 'Booking status updated successfully',
                    bookingId: Number(bookingId),
                    status: status
                });
            }
        );
    });
};

module.exports = {
    getAllBookings,
    getMyBookings,
    getProviderBookings,
    createBooking,
    updateBookingStatus
};