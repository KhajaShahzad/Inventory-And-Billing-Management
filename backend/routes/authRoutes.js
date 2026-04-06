const express = require('express');
const { register, login, getMe } = require('../controllers/authController');

const router = express.Router();

const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 20, // max 20 requests per IP per window
  message: { success: false, error: 'Too many requests, please try again later.' }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);

module.exports = router;
