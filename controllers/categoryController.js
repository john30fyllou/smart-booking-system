const db = require('../db');

const getAllCategories = (req, res) => {
    const sql = 'SELECT id, name FROM categories ORDER BY id';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        res.status(200).json(results);
    });
};

const createCategory = (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({
            message: 'Category name is required'
        });
    }

    const sql = 'INSERT INTO categories (name) VALUES (?)';

    db.query(sql, [name], (err, result) => {
        if (err) {
            console.error('Error creating category:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        res.status(201).json({
            message: 'Category created successfully',
            categoryId: result.insertId
        });
    });
};

module.exports = {
    getAllCategories,
    createCategory
};
