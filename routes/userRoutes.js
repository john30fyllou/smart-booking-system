const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');

const { getAllUsers, 
        registerUser,
        loginUser 
} = require('../controllers/userController');

router.get('/', getAllUsers);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authenticateToken,(req, res) =>{
    res.status(200).json({
        message: 'Protected route accessed successfully',
        user: req.user
    });
});

module.exports = router;