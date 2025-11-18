const express = require('express');
const { register, login, logout, profile } = require('../controllers/authController');
const jwtMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', jwtMiddleware, profile);

module.exports = router;
