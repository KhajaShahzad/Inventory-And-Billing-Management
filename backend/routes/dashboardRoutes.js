const express = require('express');
const { getDashboardStats, getChartData } = require('../controllers/dashboardController');

const router = express.Router();
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/chart', getChartData);

module.exports = router;
