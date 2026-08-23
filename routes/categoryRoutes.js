const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

const { getAllCategories, createCategory } = require('../controllers/categoryController');

router.get('/', getAllCategories);

router.post('/', authenticateToken, authorizeRoles('admin'), createCategory);
module.exports = router;
