const express = require('express');

const router = express.Router();

const { getAllUsers, 
        registerUser 
} = require('../controllers/userController');

router.get('/', getAllUsers);
router.post('/register', registerUser);

module.exports = router;