const express = require('express');
const router = express.Router();
const { requireAuth, requireViewer } = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboardController');

router.get('/', requireAuth, requireViewer, getDashboard);

module.exports = router;
