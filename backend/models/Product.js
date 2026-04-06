const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  barcode: {
    type: String,
    required: [true, 'Please provide or generate a barcode'],
    unique: true
  },
  price: {
    type: Number,
    required: [true, 'Please add a selling price']
  },
  costPrice: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    required: [true, 'Please add current stock quantity'],
    min: [0, 'Quantity cannot be less than 0']
  },
  minStockThreshold: {
    type: Number,
    default: 10
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', ProductSchema);
