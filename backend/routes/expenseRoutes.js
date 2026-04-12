const express = require('express');
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.route('/')
  .get(getExpenses)
  .post(createExpense);

router.route('/:id')
  .delete(deleteExpense);

module.exports = router;
