const express = require('express');
const { getDashboardStats, getChartData } = require('../controllers/dashboardController');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/chart', getChartData);

module.exports = router;
