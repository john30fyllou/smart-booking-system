const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');

const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

const {
    getAllUsers,
    registerUser,
    loginUser,
    updateUserRole,
    deleteUser
} = require('../controllers/userController');

router.get('/', authenticateToken, authorizeRoles('admin'), getAllUsers);

router.post('/register', registerUser);

router.post('/login', loginUser);

router.get('/profile', authenticateToken, (req, res) => {
    res.status(200).json({
        message: 'Protected route accessed successfully',

        user: req.user
    });
});

router.patch('/:id/role', authenticateToken, authorizeRoles('admin'), updateUserRole);

router.get('/provider-area', authenticateToken, authorizeRoles('provider', 'admin'), (req, res) => {
    res.status(200).json({
        message: 'Welcome to the provider area'
    });
});

router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteUser);

module.exports = router;
