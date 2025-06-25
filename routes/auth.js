const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { login, register, logout } = require('../controllers/authController');

router.post('/login', login);
router.post('/register', requireAuth, requireAdmin, register);
router.post('/logout', requireAuth, logout);

module.exports = router;
