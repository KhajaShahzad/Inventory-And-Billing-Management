const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add an expense title']
  },
  amount: {
    type: Number,
    required: [true, 'Please add an expense amount']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Utilities', 'Salary', 'Restock', 'Marketing', 'Other']
  },
  date: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Expense', ExpenseSchema);
