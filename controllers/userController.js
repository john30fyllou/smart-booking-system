const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const getAllUsers = (req, res) => {
    const sql =
        'SELECT id, first_name, last_name, email, role, approval_status, created_at FROM users';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('error fetching users: ', err);
            return res.status(500).json({
                message: 'Database error'
            });
        }
        res.status(200).json(results);
    });
};

const registerUser = async (req, res) => {
    try {
        const { first_name, last_name, email, password, role } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.'
            });
        }

        if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({
                message: 'Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα γράμμα και έναν αριθμό.'
            });
        }

        const requestedRole = role || 'customer';

        if (!['customer', 'provider'].includes(requestedRole)) {
            return res.status(400).json({
                message: 'Invalid registration role'
            });
        }

        const approvalStatus = requestedRole === 'provider' ? 'pending' : 'approved';

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users
            (
                first_name,
                last_name,
                email,
                password,
                role,
                approval_status
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [first_name, last_name, email, hashedPassword, requestedRole, approvalStatus],
            (err, result) => {
                if (err) {
                    console.error('Error creating user:', err);

                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({
                            message: 'Υπάρχει ήδη λογαριασμός με αυτό το email.'
                        });
                    }

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                res.status(201).json({
                    message:
                        requestedRole === 'provider'
                            ? 'Provider registration submitted for admin approval'
                            : 'User registered successfully',

                    userId: result.insertId,
                    role: requestedRole,
                    approvalStatus
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

const loginUser = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: 'Email and password are required'
        });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('Login database error:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const user = results[0];

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        if (user.role === 'provider' && user.approval_status !== 'approved') {
            if (user.approval_status === 'pending') {
                return res.status(403).json({
                    message: 'Ο λογαριασμός παρόχου αναμένει έγκριση από διαχειριστή.'
                });
            }

            if (user.approval_status === 'rejected') {
                return res.status(403).json({
                    message: 'Η αίτηση εγγραφής ως πάροχος έχει απορριφθεί.'
                });
            }
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h'
            }
        );

        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    });
};

const updateUserRole = (req, res) => {
    const userId = Number(req.params.id);
    const adminId = Number(req.user.id);
    const { role } = req.body;

    const allowedRoles = ['customer', 'provider', 'admin'];

    if (!userId) {
        return res.status(400).json({
            message: 'Invalid user id'
        });
    }

    if (!allowedRoles.includes(role)) {
        return res.status(400).json({
            message: 'Invalid role'
        });
    }

    if (userId === adminId) {
        return res.status(400).json({
            message: 'You cannot change your own role'
        });
    }

    const sql = `
        UPDATE users
        SET role = ?
        WHERE id = ?
    `;

    db.query(sql, [role, userId], (err, result) => {
        if (err) {
            console.error('Error updating user role:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.status(200).json({
            message: 'User role updated successfully',
            userId,
            role
        });
    });
};

const deleteUser = (req, res) => {
    const userId = Number(req.params.id);
    const adminId = Number(req.user.id);

    if (!userId) {
        return res.status(400).json({
            message: 'Invalid user id'
        });
    }

    if (userId === adminId) {
        return res.status(400).json({
            message: 'You cannot delete your own account'
        });
    }

    const userSql = `
        SELECT id, role
        FROM users
        WHERE id = ?
    `;

    db.query(userSql, [userId], (userError, users) => {
        if (userError) {
            console.error('Error checking user:', userError);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const user = users[0];

        if (user.role === 'provider') {
            const providerCheckSql = `
                    SELECT COUNT(*) AS total
                    FROM services
                    WHERE provider_id = ?
                `;

            db.query(providerCheckSql, [userId], (providerError, results) => {
                if (providerError) {
                    console.error('Error checking provider services:', providerError);

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                if (results[0].total > 0) {
                    return res.status(400).json({
                        message: 'Provider cannot be deleted because they have existing services'
                    });
                }

                performDelete();
            });

            return;
        }

        if (user.role === 'customer') {
            const customerCheckSql = `
                    SELECT COUNT(*) AS total
                    FROM bookings
                    WHERE customer_id = ?
                `;

            db.query(customerCheckSql, [userId], (customerError, results) => {
                if (customerError) {
                    console.error('Error checking customer bookings:', customerError);

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                if (results[0].total > 0) {
                    return res.status(400).json({
                        message: 'Customer cannot be deleted because they have existing bookings'
                    });
                }

                performDelete();
            });

            return;
        }

        performDelete();

        function performDelete() {
            const deleteSql = `
                    DELETE FROM users
                    WHERE id = ?
                `;

            db.query(deleteSql, [userId], (deleteError, result) => {
                if (deleteError) {
                    console.error('Error deleting user:', deleteError);

                    return res.status(500).json({
                        message: 'Database error'
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        message: 'User not found'
                    });
                }

                res.status(200).json({
                    message: 'User deleted successfully',
                    userId
                });
            });
        }
    });
};

const updateProviderApproval = (req, res) => {
    const userId = Number(req.params.id);
    const { approval_status } = req.body;

    if (!['approved', 'rejected'].includes(approval_status)) {
        return res.status(400).json({
            message: 'Invalid approval status'
        });
    }

    const sql = `
        UPDATE users
        SET approval_status = ?
        WHERE id = ?
        AND role = 'provider'
    `;

    db.query(sql, [approval_status, userId], (err, result) => {
        if (err) {
            console.error('Error updating provider approval:', err);

            return res.status(500).json({
                message: 'Database error'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Provider not found'
            });
        }

        res.status(200).json({
            message: 'Provider approval status updated successfully',

            userId,
            approval_status
        });
    });
};

module.exports = {
    getAllUsers,
    registerUser,
    loginUser,
    updateUserRole,
    deleteUser,
    updateProviderApproval
};
