const db = require('../db');

const getAvailability = (req, res) => {
    const sql = `
        SELECT
            availability.id,
            availability.provider_id,
            availability.available_date,
            availability.start_time,
            availability.end_time,
            users.first_name AS provider_first_name,
            users.last_name AS provider_last_name
        FROM availability
        JOIN users ON availability.provider_id = users.id
        ORDER BY availability.available_date, availability.start_time
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching availability:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        res.status(200).json(results);
    });
};

const createAvailability = (req, res) => {
    const providerId = req.user.id;

    const {
        available_date,
        start_time,
        end_time
    } = req.body;

    if (!available_date || !start_time || !end_time) {
        return res.status(400).json({
            message: 'Date, start time and end time are required'
        });
    }

    if (start_time >= end_time) {
        return res.status(400).json({
            message: 'End time must be after start time'
        });
    }

    const sql = `
        INSERT INTO availability
        (provider_id, available_date, start_time, end_time)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [providerId, available_date, start_time, end_time],
        (err, result) => {
            if (err) {
                console.error('Error creating availability:', err);

                return res.status(500).json({
                    message: 'Database error'
                });
            }

            res.status(201).json({
                message: 'Availability created successfully',
                availabilityId: result.insertId
            });
        }
    );
};

const updateAvailability = (req, res) => {
    const availabilityId = req.params.id;

    const {
        available_date,
        start_time,
        end_time
    } = req.body;

    if (!available_date || !start_time || !end_time) {
        return res.status(400).json({
            message: 'Date, start time and end time are required'
        });
    }

    if (start_time >= end_time) {
        return res.status(400).json({
            message: 'End time must be after start time'
        });
    }

    const findSql = `
        SELECT id, provider_id
        FROM availability
        WHERE id = ?
    `;

    db.query(findSql, [availabilityId], (err, results) => {
        if (err) {
            console.error('Error fetching availability:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: 'Availability not found'
            });
        }

        const availability = results[0];

        if (
            req.user.role === 'provider' &&
            availability.provider_id !== req.user.id
        ) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const updateSql = `
            UPDATE availability
            SET
                available_date = ?,
                start_time = ?,
                end_time = ?
            WHERE id = ?
        `;

        db.query(
            updateSql,
            [
                available_date,
                start_time,
                end_time,
                availabilityId
            ],
            (err) => {
                if (err) {
                    console.error(
                        'Error updating availability:',
                        err
                    );

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                res.status(200).json({
                    message: 'Availability updated successfully',
                    availabilityId: Number(availabilityId)
                });
            }
        );
    });
};

const deleteAvailability = (req, res) => {
    const availabilityId = req.params.id;

    const findSql = `
        SELECT id, provider_id
        FROM availability
        WHERE id = ?
    `;

    db.query(findSql, [availabilityId], (err, results) => {
        if (err) {
            console.error('Error fetching availability:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: 'Availability not found'
            });
        }

        const availability = results[0];

        if (
            req.user.role === 'provider' &&
            availability.provider_id !== req.user.id
        ) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const deleteSql = `
            DELETE FROM availability
            WHERE id = ?
        `;

        db.query(deleteSql, [availabilityId], (err) => {
            if (err) {
                console.error('Error deleting availability:', err);

                return res.status(500).json({
                    message: 'Database error'
                });
            }

            res.status(200).json({
                message: 'Availability deleted successfully',
                availabilityId: Number(availabilityId)
            });
        });
    });
};

module.exports = {
    getAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability
};