const express = require('express');
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');

const router = express.Router();
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getExpenses)
  .post(createExpense);

router.route('/:id')
  .delete(deleteExpense);

module.exports = router;
