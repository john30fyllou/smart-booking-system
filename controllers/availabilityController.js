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

module.exports = {
    getAvailability,
    createAvailability
};