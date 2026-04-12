const express = require('express');
const { getOptimizationInsights } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/optimization').get(protect, authorize('admin'), getOptimizationInsights);

module.exports = router;
