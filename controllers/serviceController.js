const db = require('../db');

const getAllServices = (req, res) => {
    const sql = `
        SELECT
            services.id,
            services.provider_id,
            services.name,
            services.description,
            services.duration_minutes,
            services.price,
            categories.name AS category_name,
            users.first_name AS provider_first_name,
            users.last_name AS provider_last_name
        FROM services
        JOIN categories ON services.category_id = categories.id
        JOIN users ON services.provider_id = users.id
        ORDER BY services.id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching services:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        res.status(200).json(results);
    });
};

const createService = (req, res) => {
    const providerId = req.user.id;

    const {
        category_id,
        name,
        description,
        duration_minutes,
        price
    } = req.body;

    if (!category_id || !name || !duration_minutes || price === undefined) {
        return res.status(400).json({
            message: 'Required fields are missing'
        });
    }

    const sql = `
        INSERT INTO services
        (provider_id, category_id, name, description, duration_minutes, price)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            providerId,
            category_id,
            name,
            description || null,
            duration_minutes,
            price
        ],
        (err, result) => {
            if (err) {
                console.error('Error creating service:', err);

                return res.status(500).json({
                    message: 'Database error'
                });
            }

            res.status(201).json({
                message: 'Service created successfully',
                serviceId: result.insertId
            });
        }
    );
};

const updateService = (req, res) => {
    const serviceId = req.params.id;

    const {
        category_id,
        name,
        description,
        duration_minutes,
        price
    } = req.body;

    if (!category_id || !name || !duration_minutes || !price) {
        return res.status(400).json({
            message: 'Category, name, duration and price are required'
        });
    }

    const findSql = `
        SELECT id, provider_id
        FROM services
        WHERE id = ?
    `;

    db.query(findSql, [serviceId], (err, results) => {
        if (err) {
            console.error('Error fetching service:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: 'Service not found'
            });
        }

        const service = results[0];

        if (
            req.user.role === 'provider' &&
            service.provider_id !== req.user.id
        ) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const updateSql = `
            UPDATE services
            SET
                category_id = ?,
                name = ?,
                description = ?,
                duration_minutes = ?,
                price = ?
            WHERE id = ?
        `;

        db.query(
            updateSql,
            [
                category_id,
                name,
                description || null,
                duration_minutes,
                price,
                serviceId
            ],
            (err) => {
                if (err) {
                    console.error('Error updating service:', err);

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                res.status(200).json({
                    message: 'Service updated successfully',
                    serviceId: Number(serviceId)
                });
            }
        );
    });
};

const deleteService = (req, res) => {
    const serviceId = req.params.id;

    const findSql = `
        SELECT id, provider_id
        FROM services
        WHERE id = ?
    `;

    db.query(findSql, [serviceId], (err, results) => {
        if (err) {
            console.error('Error fetching service:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: 'Service not found'
            });
        }

        const service = results[0];

        if (
            req.user.role === 'provider' &&
            service.provider_id !== req.user.id
        ) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const bookingCheckSql = `
            SELECT id
            FROM bookings
            WHERE service_id = ?
            LIMIT 1
        `;

        db.query(
            bookingCheckSql,
            [serviceId],
            (err, bookingResults) => {
                if (err) {
                    console.error(
                        'Error checking service bookings:',
                        err
                    );

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                if (bookingResults.length > 0) {
                    return res.status(409).json({
                        message:
                            'Service cannot be deleted because it has existing bookings'
                    });
                }

                const deleteSql = `
                    DELETE FROM services
                    WHERE id = ?
                `;

                db.query(
                    deleteSql,
                    [serviceId],
                    (err) => {
                        if (err) {
                            console.error(
                                'Error deleting service:',
                                err
                            );

                            return res.status(500).json({
                                message: 'Database error'
                            });
                        }

                        res.status(200).json({
                            message:
                                'Service deleted successfully',
                            serviceId: Number(serviceId)
                        });
                    }
                );
            }
        );
    });
};

module.exports = {
    getAllServices,
    createService,
    updateService,
    deleteService
};