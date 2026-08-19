const db = require('../db');
const bcrypt = require('bcrypt');

const getAllUsers = (req, res) => {
    const sql = 'SELECT id, first_name, last_name, email, role, created_at FROM users';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('error fetching users: ', err);
            return res.status(500).json({
                message:'Database error',
            });
        }
        res.status(200).json(results);
    });
};

const registerUser = async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (first_name, last_name, email, password)
            VALUES (?, ?, ?, ?)
        `;

        db.query(
            sql,
            [first_name, last_name, email, hashedPassword],
            (err, result) => {
                if (err) {
                    console.error('Error creating user:', err);

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                res.status(201).json({
                    message: 'User registered successfully',
                    userId: result.insertId
                });
            }
        );

    } catch (error) {
        console.error('Registration error:', error);

        res.status(500).json({
            message: 'Server error'
        });
    }
};

module.exports = {
    getAllUsers,
    registerUser
};