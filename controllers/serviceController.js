const db = require('../db');

const getAllServices = (req, res) => {
    const sql = `
        SELECT
            services.id,
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

module.exports = {
    getAllServices,
    createService
};