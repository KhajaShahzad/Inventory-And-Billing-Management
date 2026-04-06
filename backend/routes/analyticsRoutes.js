const express = require('express');
const { getOptimizationInsights } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/optimization').get(protect, getOptimizationInsights);

module.exports = router;
