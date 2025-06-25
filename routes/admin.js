const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getUsers, createUser, deleteUser, getStats } = require('../controllers/adminController');

router.get('/users', requireAuth, requireAdmin, getUsers);
router.post('/users', requireAuth, requireAdmin, createUser);
router.delete('/users/:userId', requireAuth, requireAdmin, deleteUser);
router.get('/stats', requireAuth, requireAdmin, getStats);

module.exports = router;
