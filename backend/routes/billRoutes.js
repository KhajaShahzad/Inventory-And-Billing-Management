const express = require('express');
const { createBill, getBills } = require('../controllers/billController');

const router = express.Router();
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getBills)
  .post(createBill);

module.exports = router;
