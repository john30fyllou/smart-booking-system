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
            bookings.status,
            services.provider_id
        FROM bookings
        JOIN services
            ON bookings.service_id = services.id
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

        const validTransitions = {
            pending: ['approved', 'cancelled'],
            approved: ['completed', 'cancelled'],
            cancelled: [],
            completed: []
        };

        const currentStatus = booking.status;

        if (!validTransitions[currentStatus].includes(status)) {
            return res.status(400).json({
                message: `Cannot change booking status from ${currentStatus} to ${status}`
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
                    previousStatus: currentStatus,
                    status: status
                });
            }
        );
    });
};

const cancelBooking = (req, res) => {
    const bookingId = req.params.id;
    const customerId = req.user.id;

    const findBookingSql = `
        SELECT
            id,
            customer_id,
            status
        FROM bookings
        WHERE id = ?
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
            req.user.role !== 'admin' &&
            booking.customer_id !== customerId
        ) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        if (
            booking.status === 'cancelled' ||
            booking.status === 'completed'
        ) {
            return res.status(400).json({
                message: `Cannot cancel a ${booking.status} booking`
            });
        }

        const updateSql = `
            UPDATE bookings
            SET status = 'cancelled'
            WHERE id = ?
        `;

        db.query(updateSql, [bookingId], (err) => {
            if (err) {
                console.error('Error cancelling booking:', err);

                return res.status(500).json({
                    message: 'Database error'
                });
            }

            res.status(200).json({
                message: 'Booking cancelled successfully',
                bookingId: Number(bookingId),
                status: 'cancelled'
            });
        });
    });
};

const getAvailableSlots = (req, res) => {
    const serviceId = Number(req.query.service_id);
    const bookingDate = req.query.date;

    if (!serviceId || !bookingDate) {
        return res.status(400).json({
            message: 'Service and date are required'
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

    db.query(
        serviceSql,
        [serviceId],
        (serviceError, serviceResults) => {
            if (serviceError) {
                console.error(serviceError);

                return res.status(500).json({
                    message: 'Database error'
                });
            }

            if (serviceResults.length === 0) {
                return res.status(404).json({
                    message: 'Service not found'
                });
            }

            const service = serviceResults[0];

            const availabilitySql = `
                SELECT
                    start_time,
                    end_time
                FROM availability
                WHERE provider_id = ?
                AND available_date = ?
            `;

            db.query(
                availabilitySql,
                [
                    service.provider_id,
                    bookingDate
                ],
                (availabilityError, availabilityResults) => {
                    if (availabilityError) {
                        console.error(availabilityError);

                        return res.status(500).json({
                            message: 'Database error'
                        });
                    }

                    if (availabilityResults.length === 0) {
                        return res.status(200).json({
                            slots: []
                        });
                    }

                    const bookingsSql = `
                        SELECT
                            bookings.start_time,
                            bookings.end_time
                            FROM bookings
                            JOIN services
                            ON bookings.service_id = services.id
                            WHERE services.provider_id = ?
                            AND bookings.booking_date = ?
                            AND bookings.status IN ('pending', 'approved')
                    `;

                    db.query(
                        bookingsSql,
                        [
                            service.provider_id,
                            bookingDate
                        ],
                        (bookingsError, bookings) => {
                            if (bookingsError) {
                                console.error(bookingsError);

                                return res.status(500).json({
                                    message: 'Database error'
                                });
                            }

                            const duration =
                                Number(service.duration_minutes);

                            const slots = [];

                            const timeToMinutes = (time) => {
                                const [hours, minutes] =
                                    time.split(':').map(Number);

                                return hours * 60 + minutes;
                            };

                            const minutesToTime = (minutes) => {
                                const hours =
                                    Math.floor(minutes / 60);

                                const mins =
                                    minutes % 60;

                                return (
                                    String(hours).padStart(2, '0') +
                                    ':' +
                                    String(mins).padStart(2, '0')
                                );
                            };

                            availabilityResults.forEach(
                                (availability) => {
                                    let current =
                                        timeToMinutes(
                                            availability.start_time
                                        );

                                    const availabilityEnd =
                                        timeToMinutes(
                                            availability.end_time
                                        );

                                    while (
                                        current + duration <=
                                        availabilityEnd
                                    ) {
                                        const slotStart = current;
                                        const slotEnd =
                                            current + duration;

                                        const hasConflict =
                                            bookings.some(
                                                (booking) => {
                                                    const bookedStart =
                                                        timeToMinutes(
                                                            booking.start_time
                                                        );

                                                    const bookedEnd =
                                                        timeToMinutes(
                                                            booking.end_time
                                                        );

                                                    return (
                                                        slotStart < bookedEnd &&
                                                        slotEnd > bookedStart
                                                    );
                                                }
                                            );

                                        if (!hasConflict) {
                                            slots.push(
                                                minutesToTime(
                                                    slotStart
                                                )
                                            );
                                        }

                                        current += duration;
                                    }
                                }
                            );

                            return res.status(200).json({
                                serviceId,
                                bookingDate,
                                slots
                            });
                        }
                    );
                }
            );
        }
    );
};

module.exports = {
    getAllBookings,
    getMyBookings,
    getProviderBookings,
    createBooking,
    updateBookingStatus,
    cancelBooking,
    getAvailableSlots
};